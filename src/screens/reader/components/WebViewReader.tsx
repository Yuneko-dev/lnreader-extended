import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import { getLocalServerUrl } from '@plugins/local/localServerManager';
import {
  applyRegexReplacements,
  composeCSS,
  composeJS,
} from '@utils/customCode';
import { PLUGIN_STORAGE } from '@utils/Storages';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
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
    plugin,
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
  const pluginCustomJS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.js`;
  const pluginCustomCSS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.css`;
  const readerDir =
    plugin?.lang === 'Arabic' || plugin?.lang === 'Hebrew' ? 'rtl' : 'ltr';
  const readerBottomInset = chapterGeneralSettings.fullScreenMode
    ? 0
    : bottomInset;

  const customCSS = useMemo(
    () => composeCSS(readerSettings.codeSnippetsCSS),
    [readerSettings.codeSnippetsCSS],
  );
  const customJS = useMemo(
    () => composeJS(readerSettings.codeSnippetsJS),
    [readerSettings.codeSnippetsJS],
  );
  const processedHtml = useMemo(
    () => applyRegexReplacements(html, readerSettings.regexReplacements),
    [html, readerSettings.regexReplacements],
  );

  const documentMetadataRevision = JSON.stringify({
    novel,
    chapter: { ...chapter, progress: undefined },
    nextChapter: nextChapter
      ? { ...nextChapter, progress: undefined }
      : undefined,
    prevChapter: prevChapter
      ? { ...prevChapter, progress: undefined }
      : undefined,
    pluginUseCustomCSS: readerSettings.pluginUseCustomCSS,
    pluginUseCustomJS: readerSettings.pluginUseCustomJS,
    plugin: plugin
      ? {
          id: plugin.id,
          site: plugin.site,
          lang: plugin.lang,
          imageRequestInit: plugin.imageRequestInit,
        }
      : undefined,
    theme,
    readerDir,
    bionicReading: chapterGeneralSettings.bionicReading,
    removeExtraParagraphSpacing:
      chapterGeneralSettings.removeExtraParagraphSpacing,
  });
  const documentRef = useRef({
    id: 0,
    metadataRevision: '',
    processedHtml: '',
    customCSS: '',
    customJS: '',
  });
  const previousDocument = documentRef.current;
  if (
    previousDocument.metadataRevision !== documentMetadataRevision ||
    previousDocument.processedHtml !== processedHtml ||
    previousDocument.customCSS !== customCSS ||
    previousDocument.customJS !== customJS
  ) {
    documentRef.current = {
      id: previousDocument.id + 1,
      metadataRevision: documentMetadataRevision,
      processedHtml,
      customCSS,
      customJS,
    };
  }
  const documentId = documentRef.current.id;
  const onReaderReady = useCallback(() => {
    const currentBatteryLevel = getBatteryLevelSync();
    webViewRef.current?.injectJavaScript(`
      if (window.reader && window.reader.batteryLevel) {
        window.reader.batteryLevel.val = ${currentBatteryLevel};
      }`);
  }, [webViewRef]);
  const {
    getNextChapterScreenVisible,
    getPendingScrollPosition,
    handleMessage,
  } = useReaderMessageHandler({
    documentId,
    onPress,
    onReaderReady,
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
  const documentMountedRef = useRef(false);
  const { stopNativePlayback } = tts;
  useEffect(() => {
    if (!documentMountedRef.current) {
      documentMountedRef.current = true;
      return;
    }
    stopNativePlayback();
  }, [documentId, stopNativePlayback]);

  const sourceDataRef = useRef({
    chapter,
    chapterGeneralSettings,
    customCSS,
    customJS,
    getNextChapterScreenVisible,
    getPendingScrollPosition,
    nextChapter,
    novel,
    plugin,
    pluginCustomCSS,
    pluginCustomJS,
    prevChapter,
    processedHtml,
    readerDir,
    readerBottomInset,
    readerSettings,
    theme,
  });
  sourceDataRef.current = {
    chapter,
    chapterGeneralSettings,
    customCSS,
    customJS,
    getNextChapterScreenVisible,
    getPendingScrollPosition,
    nextChapter,
    novel,
    plugin,
    pluginCustomCSS,
    pluginCustomJS,
    prevChapter,
    processedHtml,
    readerDir,
    readerBottomInset,
    readerSettings,
    theme,
  };

  const source = useMemo(() => {
    const latest = sourceDataRef.current;
    return {
      baseUrl: latest.novel.isLocal
        ? `${getLocalServerUrl()}/local/${latest.novel.id}/`
        : !latest.chapter.isDownloaded
        ? latest.plugin?.site
        : undefined,
      headers: latest.plugin?.imageRequestInit?.headers,
      method: latest.plugin?.imageRequestInit?.method,
      body: latest.plugin?.imageRequestInit?.body,
      html: generateReaderHtml({
        html: latest.processedHtml,
        theme: latest.theme,
        readerDir: latest.readerDir as any,
        readerSettings: latest.readerSettings,
        chapterGeneralSettings: latest.chapterGeneralSettings,
        novel: latest.novel,
        chapter: {
          ...latest.chapter,
          progress: lastKnownProgressRef.current,
        },
        nextChapter: latest.nextChapter,
        prevChapter: latest.prevChapter,
        assetsUriPrefix: READER_ASSETS_URI,
        batteryLevel,
        readerBottomInset: latest.readerBottomInset,
        pluginCustomCSS: latest.pluginCustomCSS,
        pluginCustomJS: latest.pluginCustomJS,
        customCSS: latest.customCSS,
        customJS: latest.customJS,
        documentId,
        nextChapterScreenVisible: latest.getNextChapterScreenVisible(),
        pendingScrollPosition: latest.getPendingScrollPosition(),
        getLocalServerUrl,
        isSettingsPreview: false,
        strings: createReaderStrings(
          latest.chapter.name,
          latest.nextChapter?.name,
        ),
      }),
    };
  }, [batteryLevel, documentId]);

  return (
    <ReaderWebViewCore
      webViewRef={webViewRef as React.RefObject<WebView | null>}
      style={{ backgroundColor: readerSettings.theme }}
      onMessagePayload={handleMessage}
      source={source}
    />
  );
};

export default memo(WebViewReader);
