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
      try {
        const { object } = await client.sendCommand('DOM.resolveNode', {
          nodeId: targetNodeId,
        });
        if (object && object.objectId) {
          await client.sendCommand('Runtime.callFunctionOn', {
            objectId: object.objectId,
            functionDeclaration:
              'function() { this.scrollIntoView({ behavior: "instant", block: "center", inline: "center" }); }',
          });
          await sleep(50);
        }
      } catch (scrollErr) {
        console.error('[CDP Scroll Error]', scrollErr);
      }

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

async function performClickAndVerify<T>(
  client: CDPClient,
  iframeRect: any,
  logPrefix: string,
  signal: AbortSignal | undefined,
  verificationFn: () => Promise<T | null>,
): Promise<T | null> {
  const clickX = iframeRect.x + Math.floor(iframeRect.width / 2);
  const clickY = iframeRect.y + Math.floor(iframeRect.height / 2);

  await sleep(4000);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) return null;
    if (attempt > 0) {
      console.log(`${logPrefix} Retrying click (attempt ${attempt + 1})...`);
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
      console.log(`${logPrefix} CDP Clicked iframe center:`, clickX, clickY);
    } catch (e) {
      console.error(`${logPrefix} CDP Click failed:`, e);
    }

    for (let i = 0; i < 7; i++) {
      await sleep(1000);
      if (signal?.aborted) return null;

      const result = await verificationFn();
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

export async function solveCloudflare(
  url: string,
  type: 'interstitial' | 'turnstile' = 'turnstile',
  signal?: AbortSignal,
): Promise<boolean> {
  let client: CDPClient | null = null;
  const logPrefix = '[solveCloudflare]';
  try {
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
      } catch {}
      if (!target) {
        await sleep(500);
        targetAttempts++;
      }
    }

    if (!target || !target.webSocketDebuggerUrl) {
      console.error(`${logPrefix} Target WebView not found for URL:`, url);
      return false;
    }

    client = new CDPClient(target.webSocketDebuggerUrl);
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
        if (!evalRes?.result?.value) {
          console.log(
            `${logPrefix} Interstitial challenge passed automatically.`,
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
      console.error(`${logPrefix} Cloudflare iframe not found or not visible.`);
      client.close();
      return false;
    }

    console.log(`${logPrefix} Found iframe at:`, iframeRect);

    const result = await performClickAndVerify<boolean>(
      client,
      iframeRect,
      logPrefix,
      signal,
      async () => {
        let isNavigatingOrSolved = false;

        try {
          const evalRes = await client!.sendCommand('Runtime.evaluate', {
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
              if (
                indicators.turnstileValue &&
                indicators.turnstileValue.length > 0
              ) {
                console.log(`${logPrefix} Turnstile response token found.`);
                isNavigatingOrSolved = true;
              } else if (!indicators.hasTurnstile) {
                console.log(
                  `${logPrefix} Turnstile indicators no longer present.`,
                );
                isNavigatingOrSolved = true;
              }
            } else {
              if (!indicators.hasScript) {
                console.log(`${logPrefix} Interstitial challenge passed.`);
                isNavigatingOrSolved = true;
              }
            }
          } else {
            console.log(
              `${logPrefix} Evaluation returned no value, assuming navigated/solved.`,
            );
            isNavigatingOrSolved = true;
          }
        } catch (e) {
          console.warn(
            `${logPrefix} Context destroyed, assuming navigated/solved.`,
            e,
          );
          isNavigatingOrSolved = true;
        }

        if (!isNavigatingOrSolved && type === 'turnstile') {
          try {
            const { root } = await client!.sendCommand('DOM.getDocument', {
              depth: -1,
              pierce: true,
            });
            let success = false;
            function traverse(node: any) {
              if (success) return;
              if (
                node.nodeName &&
                node.nodeName.toLowerCase() === 'div' &&
                node.attributes
              ) {
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
              console.log(
                `${logPrefix} Turnstile success div found inside shadow DOM.`,
              );
              isNavigatingOrSolved = true;
            }
          } catch {}
        }

        if (isNavigatingOrSolved) {
          await sleep(2000);
          return true;
        }
        return null;
      },
    );

    if (result) {
      console.log(`${logPrefix} Challenge solved successfully.`);
    } else {
      console.error(`${logPrefix} Failed to solve challenge (timeout).`);
    }

    await sleep(2000);
    client.close();
    return result || false;
  } catch (err) {
    console.error(`${logPrefix} Error:`, err);
    if (client) client.close();
    return false;
  } finally {
    NativeCDPProxy.stopProxy();
  }
}

export async function solveCloudflareTurnstile(
  url: string,
  sitekey: string,
  signal?: AbortSignal,
): Promise<string> {
  let client: CDPClient | null = null;
  const logPrefix = '[solveCloudflareTurnstile]';

  try {
    NativeCDPProxy.enableWebViewDebugging();
    const port = await NativeCDPProxy.startProxy();

    let target: any = null;
    let targetAttempts = 0;
    while (targetAttempts < 20 && !target) {
      if (signal?.aborted) return '';
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const targets = await res.json();
        target = targets.find(
          (t: any) => t.url.includes(url) || url.includes(t.url),
        );
      } catch {}
      if (!target) {
        await sleep(500);
        targetAttempts++;
      }
    }

    if (!target || !target.webSocketDebuggerUrl) {
      console.error(`${logPrefix} Target WebView not found for URL:`, url);
      return '';
    }

    client = new CDPClient(target.webSocketDebuggerUrl);
    await client.waitForOpen();

    const html = `<!DOCTYPE html>
<html>
<head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
</head>
<body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff;">
  <div id="captcha"></div>
  <script>
    window.turnstileToken = null;
    window.onload = function() {
      turnstile.render('#captcha', {
        sitekey: '${sitekey}',
        callback: function(token) {
          window.turnstileToken = token;
        }
      });
    };
  </script>
</body>
</html>`;

    await client.sendCommand('Runtime.evaluate', {
      expression: `
        document.open();
        document.write(${JSON.stringify(html)});
        document.close();
      `,
    });

    let iframeRect = null;
    let attempts = 0;
    while (attempts < 15) {
      if (signal?.aborted) return '';
      iframeRect = await getIframeRectViaCDP(client);
      if (iframeRect && iframeRect.width > 5 && iframeRect.height > 5) {
        break;
      }
      iframeRect = null;
      await sleep(1000);
      attempts++;
    }

    if (!iframeRect) {
      console.error(`${logPrefix} Cloudflare iframe not found or not visible.`);
      client.close();
      return '';
    }

    console.log(`${logPrefix} Found iframe at:`, iframeRect);

    const token = await performClickAndVerify<string>(
      client,
      iframeRect,
      logPrefix,
      signal,
      async () => {
        try {
          const evalRes = await client!.sendCommand('Runtime.evaluate', {
            expression: `window.turnstileToken`,
            returnByValue: true,
          });
          if (
            evalRes &&
            evalRes.result &&
            typeof evalRes.result.value === 'string' &&
            evalRes.result.value.length > 0
          ) {
            console.log(`${logPrefix} Turnstile token retrieved!`);
            return evalRes.result.value;
          }
        } catch {
          // ignore
        }
        return null;
      },
    );

    client.close();
    return token || '';
  } catch (err) {
    console.error(`${logPrefix} Error:`, err);
    if (client) client.close();
    return '';
  } finally {
    NativeCDPProxy.stopProxy();
  }
}
