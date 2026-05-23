import NativeCDPProxy from '@specs/NativeCDPProxy';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class CDPClient {
  ws: WebSocket;
  messageId: number = 1;
  pendingRequests: Map<
    number,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  > = new Map();
  isOpen: boolean = false;

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isOpen = true;
    };

    this.ws.onmessage = event => {
      try {
        const response = JSON.parse(event.data);
        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject, timeout } = this.pendingRequests.get(
            response.id,
          )!;
          clearTimeout(timeout);
          if (response.error) {
            reject(response.error);
          } else {
            resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.isOpen = false;
      this.pendingRequests.forEach(req => {
        clearTimeout(req.timeout);
        req.reject(new Error('WebSocket closed'));
      });
      this.pendingRequests.clear();
    };

    this.ws.onerror = () => {
      this.isOpen = false;
      this.pendingRequests.forEach(req => {
        clearTimeout(req.timeout);
        req.reject(new Error('WebSocket error'));
      });
      this.pendingRequests.clear();
    };
  }

  async waitForOpen() {
    let attempts = 0;
    while (!this.isOpen && attempts < 50) {
      await sleep(100);
      attempts++;
    }
    if (!this.isOpen) throw new Error('[CDPClient] WebSocket failed to open');
  }

  sendCommand(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Command ${method} timed out`));
      }, 10000);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout,
      });

      if (this.isOpen) {
        this.ws.send(JSON.stringify({ id, method, params }));
      } else {
        clearTimeout(timeout);
        reject(new Error('WebSocket is not open'));
      }
    });
  }

  close() {
    this.ws.close();
  }
}

async function getIframeRectViaCDP(client: CDPClient) {
  try {
    const { root } = await client.sendCommand('DOM.getDocument', {
      depth: -1,
      pierce: true,
    });

    let targetNodeId: number | null = null;
    function traverse(node: any) {
      if (node.nodeName?.toLowerCase() === 'iframe' && node.attributes) {
        const srcIdx = node.attributes.indexOf('src');
        if (srcIdx !== -1) {
          const src = node.attributes[srcIdx + 1];
          if (
            src?.includes('challenges.cloudflare.com') ||
            src?.includes('turnstile')
          ) {
            targetNodeId = node.nodeId;
            return;
          }
        }
      }
      if (node.children) {
        for (const child of node.children) traverse(child);
      }
      if (node.shadowRoots) {
        for (const shadow of node.shadowRoots) traverse(shadow);
      }
    }
    traverse(root);

    if (targetNodeId) {
      const { model } = await client.sendCommand('DOM.getBoxModel', {
        nodeId: targetNodeId,
      });
      const content = model.content;
      return {
        x: Math.round(content[0]),
        y: Math.round(content[1]),
        width: Math.round(content[2] - content[0]),
        height: Math.round(content[5] - content[1]),
      };
    }
  } catch (e) {
    console.error('[CDPClient Error]', e);
  }
  return null;
}

export async function solveCloudflare(
  url: string,
  type: 'interstitial' | 'turnstile' = 'turnstile',
  signal?: AbortSignal,
): Promise<boolean> {
  let client: CDPClient | null = null;
  try {
    // 1. Enable debugging & start proxy
    NativeCDPProxy.enableWebViewDebugging();
    const port = await NativeCDPProxy.startProxy();

    let target: any = null;
    let targetAttempts = 0;
    while (targetAttempts < 20 && !target) {
      if (signal?.aborted) return false;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const targets = await res.json();
        target = targets.find(
          (t: any) => t.url.includes(url) || url.includes(t.url),
        );
      } catch {
        // proxy might be starting
      }
      if (!target) {
        await sleep(500);
        targetAttempts++;
      }
    }

    if (!target || !target.webSocketDebuggerUrl) {
      console.error('[solveCloudflare] Target WebView not found for URL:', url);
      return false;
    }

    // Connect WebSocket
    const wsUrl = target.webSocketDebuggerUrl;
    client = new CDPClient(wsUrl);
    await client.waitForOpen();

    let iframeRect = null;
    let attempts = 0;
    while (attempts < 15) {
      if (signal?.aborted) return false;
      if (type === 'interstitial') {
        const evalRes = await client.sendCommand('Runtime.evaluate', {
          expression: `!!document.querySelector('script[src*="/cdn-cgi/challenge-platform/"]')`,
          returnByValue: true,
        });
        const scriptExists = evalRes?.result?.value;
        if (!scriptExists) {
          console.log(
            '[solveCloudflare] Interstitial challenge passed automatically.',
          );
          client.close();
          return true;
        }
      }

      iframeRect = await getIframeRectViaCDP(client);
      if (iframeRect && iframeRect.width > 5 && iframeRect.height > 5) {
        break;
      }
      iframeRect = null;
      await sleep(1000);
      attempts++;
    }

    if (!iframeRect) {
      console.error(
        '[solveCloudflare] Cloudflare iframe not found or not visible.',
      );
      client.close();
      return false;
    }

    console.log('[solveCloudflare] Found iframe at:', iframeRect);

    const clickX = iframeRect.x + Math.floor(iframeRect.width / 2);
    const clickY = iframeRect.y + Math.floor(iframeRect.height / 2);

    let solved = false;

    // Wait for the Cloudflare widget to finish its initial animation/spinner
    await sleep(4000);

    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal?.aborted) return false;
      if (attempt > 0) {
        console.log(`[solveCloudflare] Retrying click (attempt ${attempt + 1})...`);
        await sleep(2000);
      }

      try {
        await client.sendCommand('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: clickX,
          y: clickY,
        });
        await sleep(50);
        await client.sendCommand('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: clickX,
          y: clickY,
          button: 'left',
          clickCount: 1,
        });
        await sleep(50);
        await client.sendCommand('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: clickX,
          y: clickY,
          button: 'left',
          clickCount: 1,
        });
        console.log(
          '[solveCloudflare] CDP Clicked iframe center:',
          clickX,
          clickY,
        );
      } catch (e) {
        console.error('[solveCloudflare] CDP Click failed:', e);
      }

      // Wait up to 7 seconds to see if solved
      for (let i = 0; i < 7; i++) {
        if (signal?.aborted) return false;
        await sleep(1000);

        let isNavigatingOrSolved = false;

        try {
          const evalRes = await client.sendCommand('Runtime.evaluate', {
            expression: `(() => {
               const hasScript = !!document.querySelector('script[src*="/cdn-cgi/challenge-platform/"]');
               const hasTurnstile = !!document.querySelector('script[src*="challenges.cloudflare.com/turnstile/v0"]') || !!document.querySelector('input[name="cf-turnstile-response"]');
               const input = document.querySelector('input[name="cf-turnstile-response"]');
               const turnstileValue = input ? input.value : null;
               return { hasScript, hasTurnstile, turnstileValue };
            })();`,
            returnByValue: true,
          });

          if (evalRes && evalRes.result && evalRes.result.value) {
            const indicators = evalRes.result.value;
            if (type === 'turnstile') {
              if (indicators.turnstileValue && indicators.turnstileValue.length > 0) {
                console.log('[solveCloudflare] Turnstile response token found.');
                isNavigatingOrSolved = true;
              } else if (!indicators.hasTurnstile) {
                console.log('[solveCloudflare] Turnstile indicators no longer present.');
                isNavigatingOrSolved = true;
              }
            } else {
              if (!indicators.hasScript) {
                console.log('[solveCloudflare] Interstitial challenge passed.');
                isNavigatingOrSolved = true;
              }
            }
          } else {
             // Unexpected result (e.g. context destroyed returned as a success with no value in some edge cases)
             console.log('[solveCloudflare] Evaluation returned no value, assuming navigated/solved.');
             isNavigatingOrSolved = true;
          }
        } catch (e) {
          // Context destroyed usually means the page navigated away successfully
          console.log('[solveCloudflare] Context destroyed, assuming navigated/solved.');
          isNavigatingOrSolved = true;
        }

        // Additional check for Turnstile: the success div inside shadow DOM
        if (!isNavigatingOrSolved && type === 'turnstile') {
          try {
            const { root } = await client.sendCommand('DOM.getDocument', { depth: -1, pierce: true });
            let success = false;
            function traverse(node: any) {
              if (success) return;
              if (node.nodeName && node.nodeName.toLowerCase() === 'div' && node.attributes) {
                const idIdx = node.attributes.indexOf('id');
                if (idIdx !== -1 && node.attributes[idIdx + 1] === 'success') {
                  success = true;
                  return;
                }
              }
              if (node.children) {
                for (const child of node.children) traverse(child);
              }
              if (node.shadowRoots) {
                for (const shadow of node.shadowRoots) traverse(shadow);
              }
            }
            traverse(root);
            if (success) {
              console.log('[solveCloudflare] Turnstile success div found inside shadow DOM.');
              isNavigatingOrSolved = true;
            }
          } catch (e) {
            // Ignore CDP errors
          }
        }

        if (isNavigatingOrSolved) {
          solved = true;
          break;
        }
      }

      if (solved) {
        break;
      }
    }

    if (solved) {
      console.log('[solveCloudflare] Challenge solved successfully.');
    } else {
      console.error('[solveCloudflare] Failed to solve challenge (timeout).');
    }

    await sleep(2000);
    client.close();
    return solved;
  } catch (err) {
    console.error('[solveCloudflare] Error:', err);
    return false;
  } finally {
    if (client) {
      try {
        client.close();
      } catch {}
    }
    NativeCDPProxy.stopProxy();
  }
}
