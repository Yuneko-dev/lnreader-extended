import { ChapterInfo, NovelInfo } from '@database/types';
import {
  ChapterGeneralSettings,
  ChapterReaderSettings,
} from '@hooks/persisted/useSettings';
import { ThemeColors } from '@theme/types';
import color from 'color';
import { StatusBar } from 'react-native';

export interface HtmlTemplateOptions {
  html: string;
  theme: ThemeColors;
  readerSettings: ChapterReaderSettings;
  chapterGeneralSettings: ChapterGeneralSettings;
  novel: Partial<NovelInfo>;
  chapter: Partial<ChapterInfo>;
  nextChapter?: Partial<ChapterInfo>;
  prevChapter?: Partial<ChapterInfo>;
  assetsUriPrefix: string;
  batteryLevel: number | null;
  readerBottomInset?: number;
  pluginCustomCSS?: string;
  pluginCustomJS?: string;
  nextChapterScreenVisible?: boolean;
  pendingScrollPosition?: 'start' | 'end' | number | null;
  readerDir?: 'rtl' | 'ltr';
  getLocalServerUrl?: () => string;
  isSettingsPreview?: boolean;
  strings: {
    finished: string;
    nextChapter: string;
    noNextChapter: string;
  };
}

export const generateReaderHtml = (options: HtmlTemplateOptions) => {
  const {
    html,
    theme,
    readerSettings,
    chapterGeneralSettings,
    novel,
    chapter,
    nextChapter,
    prevChapter,
    assetsUriPrefix,
    batteryLevel,
    readerBottomInset = 0,
    pluginCustomCSS = '',
    pluginCustomJS = '',
    nextChapterScreenVisible = false,
    pendingScrollPosition,
    readerDir: providedReaderDir,
    getLocalServerUrl,
    isSettingsPreview = false,
    strings,
  } = options;

  const readerDir =
    providedReaderDir || (readerSettings.textAlign === 'right' ? 'rtl' : 'ltr');

  // Safe JSON serialization for inline scripts
  const safeJsonStringify = (data: any) =>
    JSON.stringify(data).replace(/</g, '\\u003c');

  const initialReaderConfig = {
    readerSettings,
    chapterGeneralSettings,
    novel,
    chapter,
    nextChapter,
    prevChapter,
    batteryLevel,
    autoSaveInterval: 2222,
    initialScrollPosition: pendingScrollPosition,
    DEBUG: __DEV__,
    strings,
  };

  const initialPageReaderConfig = {
    nextChapterScreenVisible,
  };

  const cspMeta =
    !isSettingsPreview && !novel.isLocal
      ? '<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">'
      : '';

  // <meta name="lnreader-chapter-type" content="video">
  const isVideoChapter =
    /<meta\s+name=["']lnreader-chapter-type["']\s+content=["']video["']/i.test(
      html,
    );

  const proxyFetchScript =
    !isSettingsPreview && getLocalServerUrl
      ? `
    <script>
      const ORIGINAL_FETCH = Symbol();
      window[ORIGINAL_FETCH] = window.fetch;
      window.reader.fetch = async function(url, init = {}) {
        const targetUrl = encodeURIComponent(url);
        const proxyUrl = '${getLocalServerUrl()}/proxy?url=' + targetUrl;

        let modifiedHeaders = {};
        if (init.headers) {
          const h = new Headers(init.headers);
          h.forEach((value, key) => {
            modifiedHeaders['x-ln-forward-header-' + key] = value;
          });
        }

        const modifiedInit = { ...init };
        modifiedInit.headers = modifiedHeaders;

        return window[ORIGINAL_FETCH](proxyUrl, modifiedInit);
      };
    </script>
    `
      : '';

  const pluginJsScript =
    !isSettingsPreview && pluginCustomJS
      ? `<script src="${pluginCustomJS}"></script>`
      : '';

  const pluginCssLink =
    !isSettingsPreview && pluginCustomCSS
      ? `<link rel="stylesheet" href="${pluginCustomCSS}">`
      : '';

  const corePlayerScripts = isVideoChapter
    ? `
    <link rel="stylesheet" href="${assetsUriPrefix}/css/core-player.css">
    <script src="${assetsUriPrefix}/js/videoFullscreen.js"></script>
    <script src="${assetsUriPrefix}/js/modules/media/hls.min.js"></script>
    <script src="${assetsUriPrefix}/js/core-player.js"></script>
    `
    : '';

  return `
<!DOCTYPE html>
<html dir="${readerDir}">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    ${cspMeta}
    <link rel="stylesheet" href="${assetsUriPrefix}/css/index.css">
    <link rel="stylesheet" href="${assetsUriPrefix}/css/pageReader.css">
    <link rel="stylesheet" href="${assetsUriPrefix}/css/pullSpinner.css">
    <link rel="stylesheet" href="${assetsUriPrefix}/css/toolWrapper.css">
    <link rel="stylesheet" href="${assetsUriPrefix}/css/tts.css">
    <style>
      :root {
        --StatusBar-currentHeight: ${StatusBar.currentHeight}px;
        --readerSettings-theme: ${readerSettings.theme};
        --readerSettings-padding: ${readerSettings.padding}px;
        --readerSettings-textSize: ${readerSettings.textSize}px;
        --readerSettings-textColor: ${readerSettings.textColor};
        --readerSettings-textAlign: ${readerSettings.textAlign};
        --readerSettings-lineHeight: ${readerSettings.lineHeight};
        --readerSettings-fontFamily: ${readerSettings.fontFamily};
        --theme-primary: ${theme.primary};
        --theme-onPrimary: ${theme.onPrimary};
        --theme-secondary: ${theme.secondary};
        --theme-tertiary: ${theme.tertiary};
        --theme-onTertiary: ${theme.onTertiary};
        --theme-onSecondary: ${theme.onSecondary};
        --theme-surface: ${theme.surface};
        --theme-surface-0-9: ${color(theme.surface).alpha(0.9).toString()};
        --theme-onSurface: ${theme.onSurface};
        --theme-surfaceVariant: ${theme.surfaceVariant};
        --theme-onSurfaceVariant: ${theme.onSurfaceVariant};
        --theme-outline: ${theme.outline};
        --theme-rippleColor: ${theme.rippleColor};
        --reader-bottomInset: ${readerBottomInset}px;
      }
      
      @font-face {
        font-family: ${readerSettings.fontFamily};
        src: url("file:///android_asset/fonts/${
          readerSettings.fontFamily
        }.ttf");
      }
    </style>
    ${pluginCssLink}
    <style>${readerSettings.customCSS || ''}</style>
  </head>
  <body class="${chapterGeneralSettings.pageReader ? 'page-reader' : ''}">
    <div id="LNReader-chapter">
      <div class="transition-chapter" id="LNReader-title-novel">
        ${chapter.name}
      </div>
      ${html}  
    </div>
    <div id="reader-ui"></div>
  </body>
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        msg: message + " at " + source + ":" + lineno + ":" + colno + (error ? "\\n" + error.stack : "")
      }));
      return true;
    };

    var initialPageReaderConfig = ${safeJsonStringify(initialPageReaderConfig)};
    var initialReaderConfig = ${safeJsonStringify(initialReaderConfig)};
  </script>
  <script src="${assetsUriPrefix}/js/modules/core/polyfill-onscrollend.js"></script>
  <script src="${assetsUriPrefix}/js/icons.js"></script>
  <script src="${assetsUriPrefix}/js/modules/core/van.js"></script>
  <script src="${assetsUriPrefix}/js/modules/core/text-vibe.js"></script>
  <script src="${assetsUriPrefix}/js/core.js"></script>
  <script src="${assetsUriPrefix}/js/debug.js"></script>
  <script src="${assetsUriPrefix}/js/theme.js"></script>
  <script src="${assetsUriPrefix}/js/tts.js"></script>
  <script src="${assetsUriPrefix}/js/page-reader.js"></script>
  <script src="${assetsUriPrefix}/js/gestures.js"></script>
  <script src="${assetsUriPrefix}/js/keyboard-handler.js"></script>
  <script src="${assetsUriPrefix}/js/index.js"></script>
  ${proxyFetchScript}
  ${corePlayerScripts}
  ${pluginJsScript}
  <script>
    ${readerSettings.customJS || ''}
  </script>
</html>
  `;
};
