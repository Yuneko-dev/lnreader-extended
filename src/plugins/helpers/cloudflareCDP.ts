import NativeCDPProxy from '../../../specs/NativeCDPProxy';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class CDPClient {
  ws: WebSocket;
  messageId: number = 1;
  pendingRequests: Map<number, { resolve: Function; reject: Function }> =
    new Map();
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
          const { resolve, reject } = this.pendingRequests.get(response.id)!;
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
      this.pendingRequests.forEach(req =>
        req.reject(new Error('WebSocket closed')),
      );
      this.pendingRequests.clear();
    };

    this.ws.onerror = () => {
      this.isOpen = false;
      this.pendingRequests.forEach(req =>
        req.reject(new Error('WebSocket error')),
      );
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
        resolve: (res: any) => {
          clearTimeout(timeout);
          resolve(res);
        },
        reject: (err: any) => {
          clearTimeout(timeout);
          reject(err);
        },
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
): Promise<boolean> {
  let client: CDPClient | null = null;
  try {
    // 1. Enable debugging & start proxy
    NativeCDPProxy.enableWebViewDebugging();
    const port = await NativeCDPProxy.startProxy();

    // 2. Fetch targets to find our WebView
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await res.json();

    const target = targets.find(
      (t: any) => t.url.includes(url) || url.includes(t.url),
    );
    if (!target || !target.webSocketDebuggerUrl) {
      return false;
    }

    // Connect WebSocket
    const wsUrl = target.webSocketDebuggerUrl;
    client = new CDPClient(wsUrl);
    await client.waitForOpen();

    let iframeRect = null;
    let attempts = 0;
    while (attempts < 15) {
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

    await sleep(1000);

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

    let solved = false;
    for (let i = 0; i < 15; i++) {
      await sleep(1000);

      if (type === 'turnstile') {
        const rect = await getIframeRectViaCDP(client);
        if (!rect) {
          solved = true;
          break;
        }

        const evalRes = await client.sendCommand('Runtime.evaluate', {
          expression: `(function() {
            const input = document.querySelector('input[name="cf-turnstile-response"]');
            return input ? input.value : null;
          })();`,
          returnByValue: true,
        });
        const responseValue = evalRes?.result?.value;

        if (responseValue && responseValue.length > 0) {
          solved = true;
          console.log('[solveCloudflare] Turnstile response token found.');
          break;
        }
      } else {
        const evalRes = await client.sendCommand('Runtime.evaluate', {
          expression: `!!document.querySelector('script[src*="/cdn-cgi/challenge-platform/"]')`,
          returnByValue: true,
        });
        const scriptExists = evalRes?.result?.value;
        if (!scriptExists) {
          solved = true;
          console.log('[solveCloudflare] Interstitial challenge passed.');
          break;
        }
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
    if (client) {
      try {
        client.close();
      } catch {}
    }
    return false;
  }
}
