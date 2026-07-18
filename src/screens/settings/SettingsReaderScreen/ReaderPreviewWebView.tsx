import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import { getString } from '@strings/translations';
import {
  applyRegexReplacements,
  composeCSS,
  composeJS,
} from '@utils/customCode';
import { showToast } from '@utils/showToast';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { getBatteryLevelSync } from 'react-native-device-info';
import type WebView from 'react-native-webview';

import { useReaderSettingsBridge } from '../../reader/components/Hooks/useReaderSettings';
import useTTSPlayback from '../../reader/components/Hooks/useTTSPlayback';
import useVolumeButtonScroll from '../../reader/components/Hooks/useVolumeButtonScroll';
import { parseWebViewEvent } from '../../reader/components/Hooks/webViewEvents';
import ReaderWebViewCore from '../../reader/components/ReaderWebView/ReaderWebViewCore';
import { generateReaderHtml } from '../../reader/utils/htmlGenerator';
import {
  createReaderStrings,
  READER_ASSETS_URI,
} from '../../reader/utils/readerWebViewConfig';
import { previewChapter, previewHTML, previewNovel } from './previewFixture';

const ReaderPreviewWebView = () => {
  const theme = useTheme();
  const readerSettings = useChapterReaderSettings();
  const generalSettings = useChapterGeneralSettings();
  const webViewRef = useRef<WebView>(null);
  const settingsRef = useRef<ChapterReaderSettings>(readerSettings);
  const progressRef = useRef(previewChapter.progress ?? 0);
  settingsRef.current = readerSettings;
  useVolumeButtonScroll({
    enabled: generalSettings.useVolumeButtons,
    pageReader: generalSettings.pageReader,
    volumeButtonsOffset: generalSettings.volumeButtonsOffset,
    webViewRef,
  });
  const playback = useTTSPlayback({
    readerSettingsRef: settingsRef,
    onDone: () =>
      webViewRef.current?.injectJavaScript(
        'tts.setLoading(false); tts.next?.();',
      ),
    onError: error => {
      webViewRef.current?.injectJavaScript(
        'tts.setLoading(false); tts.stop?.();',
      );
      showToast(
        getString(
          error === 'voice-required'
            ? 'readerSettings.tts.voiceRequiredError'
            : error === 'tiktok-unavailable'
            ? 'readerSettings.tts.engineUnavailableError'
            : 'readerSettings.tts.playbackError',
        ),
      );
    },
    onInterrupted: () =>
      webViewRef.current?.injectJavaScript(
        'tts.setLoading(false); tts.stop?.();',
      ),
    onStart: () =>
      webViewRef.current?.injectJavaScript('tts.setLoading(true);'),
  });
  useReaderSettingsBridge({
    bottomInset: 0,
    chapterGeneralSettings: generalSettings,
    readerSettings,
    stopNativePlayback: playback.stopAll,
    webViewRef,
  });

  const latestRef = useRef({ generalSettings, readerSettings });
  latestRef.current = { generalSettings, readerSettings };
  const customCSS = useMemo(
    () => composeCSS(readerSettings.codeSnippetsCSS),
    [readerSettings.codeSnippetsCSS],
  );
  const customJS = useMemo(
    () => composeJS(readerSettings.codeSnippetsJS),
    [readerSettings.codeSnippetsJS],
  );
  const processedPreviewHTML = useMemo(
    () => applyRegexReplacements(previewHTML, readerSettings.regexReplacements),
    [readerSettings.regexReplacements],
  );
  const source = useMemo(() => {
    const latest = latestRef.current;
    return {
      html: generateReaderHtml({
        assetsUriPrefix: READER_ASSETS_URI,
        batteryLevel: getBatteryLevelSync(),
        chapter: { ...previewChapter, progress: progressRef.current },
        chapterGeneralSettings: latest.generalSettings,
        html: processedPreviewHTML,
        isSettingsPreview: true,
        novel: previewNovel,
        readerSettings: latest.readerSettings,
        customCSS,
        customJS,
        strings: createReaderStrings(previewChapter.name),
        theme,
      }),
    };
  }, [customCSS, customJS, processedPreviewHTML, theme]);

  const codeRef = useRef({
    css: customCSS,
    js: customJS,
    html: processedPreviewHTML,
  });
  useEffect(() => {
    const changed =
      codeRef.current.css !== customCSS ||
      codeRef.current.js !== customJS ||
      codeRef.current.html !== processedPreviewHTML;
    codeRef.current = {
      css: customCSS,
      js: customJS,
      html: processedPreviewHTML,
    };
    if (changed) playback.stop();
  }, [customCSS, customJS, playback, processedPreviewHTML]);

  const handleMessage = useCallback(
    (payload: string) => {
      const event = parseWebViewEvent(payload);
      if (!event) {
        return;
      }
      switch (event.type) {
        case 'hide':
          webViewRef.current?.injectJavaScript(
            'if (window.reader?.hidden) reader.hidden.val = !reader.hidden.val;',
          );
          break;
        case 'save':
          if (typeof event.data === 'number') {
            progressRef.current = event.data;
          }
          break;
        case 'tts-queue':
          playback.handleQueue(event);
          break;
        case 'speak':
          if (typeof event.data === 'string' && event.data.trim()) {
            playback.handleSpeak(event);
          } else {
            webViewRef.current?.injectJavaScript('tts.next?.();');
          }
          break;
        case 'pause-speak':
          playback.pause();
          break;
        case 'stop-speak':
          playback.stop();
          break;
        case 'console': {
          const method = ['debug', 'error', 'info', 'log', 'warn'].includes(
            event.method ?? '',
          )
            ? (event.method as 'debug' | 'error' | 'info' | 'log' | 'warn')
            : 'log';
          // eslint-disable-next-line no-console
          console[method]('[Reader preview]', ...(event.args ?? []));
          break;
        }
        case 'error':
          // eslint-disable-next-line no-console
          console.error('[Reader preview]', event.msg);
          break;
      }
    },
    [playback],
  );

  return (
    <ReaderWebViewCore
      nestedScrollEnabled
      onLoadEnd={() =>
        webViewRef.current?.injectJavaScript(
          `if (window.reader?.batteryLevel) reader.batteryLevel.val = ${getBatteryLevelSync()};`,
        )
      }
      onMessagePayload={handleMessage}
      source={source}
      style={[styles.webView, { backgroundColor: readerSettings.theme }]}
      webViewRef={webViewRef}
    />
  );
};

export default React.memo(ReaderPreviewWebView);

const styles = StyleSheet.create({ webView: { flex: 1 } });
