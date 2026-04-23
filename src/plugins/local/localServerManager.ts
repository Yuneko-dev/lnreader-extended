import NativeLocalServer from '@specs/NativeLocalServer';

let serverStarted = false;

/**
 * Initialize the local HTTP server.
 * Should be called once during app startup.
 */
export const initLocalServer = async (): Promise<void> => {
  if (serverStarted) {
    console.info(
      '[LocalServer] Already started, URL:',
      NativeLocalServer.getServerUrl(),
    );
    return;
  }
  try {
    console.info('[LocalServer] Starting server...');
    const port = await NativeLocalServer.startServer();
    serverStarted = true;
    console.info(
      '[LocalServer] Server started on port',
      port,
      '→',
      NativeLocalServer.getServerUrl(),
    );
  } catch (e) {
    console.error('[LocalServer] Failed to start:', e);
  }
};

/**
 * Get the current local server base URL (e.g. "http://127.0.0.1:54321").
 * Returns empty string if server is not running.
 */
export const getLocalServerUrl = (): string => {
  return NativeLocalServer.getServerUrl();
};

/**
 * Build a full URL to a local file served by the HTTP server.
 * The path should be relative to NOVEL_STORAGE (e.g. "local/115/12377/index.html").
 */
export const getLocalFileUrl = (relativePath: string): string => {
  const baseUrl = getLocalServerUrl();
  console.info('[LocalServer] Local server URL: ', baseUrl);
  console.info('[LocalServer] Relative path: ', relativePath);
  if (!baseUrl) {
    return '';
  }
  // Remove leading slash if present
  const cleanPath = relativePath.startsWith('/')
    ? relativePath.substring(1)
    : relativePath;
  return `${baseUrl}/${cleanPath}`;
};
