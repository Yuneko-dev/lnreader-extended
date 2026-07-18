import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import { getLocalServerUrl } from '@plugins/local/localServerManager';
import { getPlugin } from '@plugins/pluginManager';
import { PLUGIN_STORAGE } from '@utils/Storages';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { getBatteryLevelSync } from 'react-native-device-info';
import type WebView from 'react-native-webview';

import { useChapterContext } from '../ChapterContext';
import type { NativeFindResult } from '../hooks/useNativeChapterSearch';
import { generateReaderHtml } from '../utils/htmlGenerator';
import {
  createReaderStrings,
  READER_ASSETS_URI,
} from '../utils/readerWebViewConfig';
import useReaderMessageHandler from './Hooks/useReaderMessageHandler';
import { useReaderSettingsBridge } from './Hooks/useReaderSettings';
import useReadingTime from './Hooks/useReadingTime';
import useTTS from './Hooks/useTTS';
import ReaderWebViewCore from './ReaderWebView/ReaderWebViewCore';

type WebViewReaderProps = {
  onPress(): void;
  onFindResult(result: NativeFindResult): void;
  bottomInset: number;
};

const WebViewReader: React.FC<WebViewReaderProps> = ({
  onPress,
  onFindResult,
  bottomInset,
}) => {
  const {
    novel,
    chapter,
    chapterText: html,
    navigateChapter,
    saveProgress,
    nextChapter,
    prevChapter,
    webViewRef,
    resetAutoScroll,
    refetch,
  } = useChapterContext();
  const theme = useTheme();
  const readerSettings = useChapterReaderSettings();
  const chapterGeneralSettings = useChapterGeneralSettings();
  const readerSettingsRef = useRef<ChapterReaderSettings>(readerSettings);
  const lastKnownProgressRef = useRef(chapter.progress ?? 0);
  const chapterIdRef = useRef(chapter.id);
  if (chapterIdRef.current !== chapter.id) {
    chapterIdRef.current = chapter.id;
    lastKnownProgressRef.current = chapter.progress ?? 0;
  }
  readerSettingsRef.current = readerSettings;
  const readingTime = useReadingTime(chapter.id);
  const tts = useTTS({
    webViewRef,
    novel,
    chapter,
    readerSettingsRef,
    readingTime,
  });

  useReaderSettingsBridge({
    webViewRef,
    bottomInset,
    chapterGeneralSettings,
    readerSettings,
    stopNativePlayback: tts.stopNativePlayback,
  });

  useEffect(
    () => () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    },
    [],
  );

  const batteryLevel = useMemo(() => getBatteryLevelSync(), []);
  const plugin = getPlugin(novel.pluginId);
  const pluginCustomJS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.js`;
  const pluginCustomCSS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.css`;
  const readerDir =
    plugin?.lang === 'Arabic' || plugin?.lang === 'Hebrew' ? 'rtl' : 'ltr';
  const readerBottomInset = chapterGeneralSettings.fullScreenMode
    ? 0
    : bottomInset;

  const {
    clearPendingScrollPosition,
    getNextChapterScreenVisible,
    getPendingScrollPosition,
    handleMessage,
  } = useReaderMessageHandler({
    onPress,
    onFindResult,
    navigateChapter,
    saveProgress,
    resetAutoScroll,
    refetch,
    tts,
    onProgress: progress => {
      lastKnownProgressRef.current = progress;
    },
  });

  const customCodeRef = useRef({
    customCSS: readerSettings.customCSS,
    customJS: readerSettings.customJS,
  });
  useEffect(() => {
    const previous = customCodeRef.current;
    customCodeRef.current = {
      customCSS: readerSettings.customCSS,
      customJS: readerSettings.customJS,
    };
    if (
      previous.customCSS !== readerSettings.customCSS ||
      previous.customJS !== readerSettings.customJS
    ) {
      tts.stopNativePlayback();
    }
  }, [readerSettings.customCSS, readerSettings.customJS, tts]);

  const sourceDataRef = useRef({
    chapter,
    chapterGeneralSettings,
    nextChapter,
    prevChapter,
    readerBottomInset,
    readerSettings,
  });
  sourceDataRef.current = {
    chapter,
    chapterGeneralSettings,
    nextChapter,
    prevChapter,
    readerBottomInset,
    readerSettings,
  };
  const sourceChapterId = chapter.id;
  const sourceChapterDownloaded = chapter.isDownloaded;
  const sourceCustomCSS = readerSettings.customCSS;
  const sourceCustomJS = readerSettings.customJS;
  const sourceNextChapterId = nextChapter?.id;
  const sourcePrevChapterId = prevChapter?.id;

  const source = useMemo(() => {
    const latest = sourceDataRef.current;
    return {
      baseUrl: novel.isLocal
        ? `${getLocalServerUrl()}/local/${novel.id}/`
        : !sourceChapterDownloaded
        ? plugin?.site
        : undefined,
      headers: plugin?.imageRequestInit?.headers,
      method: plugin?.imageRequestInit?.method,
      body: plugin?.imageRequestInit?.body,
      html: generateReaderHtml({
        html,
        theme,
        readerDir,
        readerSettings: {
          ...latest.readerSettings,
          customCSS: sourceCustomCSS,
          customJS: sourceCustomJS,
        },
        chapterGeneralSettings: latest.chapterGeneralSettings,
        novel,
        chapter: {
          ...latest.chapter,
          id: sourceChapterId,
          progress: lastKnownProgressRef.current,
        },
        nextChapter: latest.nextChapter
          ? { ...latest.nextChapter, id: sourceNextChapterId }
          : undefined,
        prevChapter: latest.prevChapter
          ? { ...latest.prevChapter, id: sourcePrevChapterId }
          : undefined,
        assetsUriPrefix: READER_ASSETS_URI,
        batteryLevel,
        readerBottomInset: latest.readerBottomInset,
        pluginCustomCSS,
        pluginCustomJS,
        nextChapterScreenVisible: getNextChapterScreenVisible(),
        pendingScrollPosition: getPendingScrollPosition(),
        getLocalServerUrl,
        isSettingsPreview: false,
        strings: createReaderStrings(
          latest.chapter.name,
          latest.nextChapter?.name,
        ),
      }),
    };
  }, [
    batteryLevel,
    sourceChapterDownloaded,
    sourceChapterId,
    getNextChapterScreenVisible,
    getPendingScrollPosition,
    html,
    novel,
    plugin?.imageRequestInit,
    plugin?.site,
    pluginCustomCSS,
    pluginCustomJS,
    readerDir,
    sourceCustomCSS,
    sourceCustomJS,
    sourceNextChapterId,
    sourcePrevChapterId,
    theme,
  ]);

  return (
    <ReaderWebViewCore
      webViewRef={webViewRef as React.RefObject<WebView | null>}
      style={{ backgroundColor: readerSettings.theme }}
      onLoadEnd={() => {
        const currentBatteryLevel = getBatteryLevelSync();
        webViewRef.current?.injectJavaScript(`
          if (window.reader && window.reader.batteryLevel) {
            window.reader.batteryLevel.val = ${currentBatteryLevel};
          }`);
        if (getPendingScrollPosition()) {
          clearPendingScrollPosition();
        }
        tts.handleLoadEnd();
      }}
      onMessagePayload={handleMessage}
      source={source}
    />
  );
};

export default memo(WebViewReader);
