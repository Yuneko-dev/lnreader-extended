import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import type {
  ChapterGeneralSettings,
  ChapterReaderSettings,
} from '@hooks/persisted/useSettings';
import { getUserAgent } from '@hooks/persisted/useUserAgent';
import { getLocalServerUrl } from '@plugins/local/localServerManager';
import { getPlugin } from '@plugins/pluginManager';
import { getString } from '@strings/translations';
import { PLUGIN_STORAGE } from '@utils/Storages';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { getBatteryLevelSync } from 'react-native-device-info';
import WebView from 'react-native-webview';

import { useChapterContext } from '../ChapterContext';
import type { NativeFindResult } from '../hooks/useNativeChapterSearch';
import { generateReaderHtml } from '../utils/htmlGenerator';
import useReaderMessageHandler from './Hooks/useReaderMessageHandler';
import { useReaderSettingsBridge } from './Hooks/useReaderSettings';
import useReadingTime from './Hooks/useReadingTime';
import useTTS from './Hooks/useTTS';

type WebViewReaderProps = {
  onPress(): void;
  onFindResult(result: NativeFindResult): void;
  bottomInset: number;
};

const assetsUriPrefix = __DEV__
  ? 'http://localhost:8081/assets'
  : 'file:///android_asset';

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
  const chapterGeneralSettingsRef = useRef<ChapterGeneralSettings>(
    chapterGeneralSettings,
  );
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

  useEffect(() => {
    readerSettingsRef.current = readerSettings;
    chapterGeneralSettingsRef.current = chapterGeneralSettings;
  }, [chapterGeneralSettings, readerSettings]);

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
  const readerBottomInset = chapterGeneralSettingsRef.current.fullScreenMode
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
  });

  const source = useMemo(
    () => ({
      baseUrl: novel.isLocal
        ? `${getLocalServerUrl()}/local/${novel.id}/`
        : !chapter.isDownloaded
        ? plugin?.site
        : undefined,
      headers: plugin?.imageRequestInit?.headers,
      method: plugin?.imageRequestInit?.method,
      body: plugin?.imageRequestInit?.body,
      html: generateReaderHtml({
        html,
        theme,
        readerDir,
        readerSettings: readerSettingsRef.current,
        chapterGeneralSettings: chapterGeneralSettingsRef.current,
        novel,
        chapter,
        nextChapter,
        prevChapter,
        assetsUriPrefix,
        batteryLevel,
        readerBottomInset,
        pluginCustomCSS,
        pluginCustomJS,
        nextChapterScreenVisible: getNextChapterScreenVisible(),
        pendingScrollPosition: getPendingScrollPosition(),
        getLocalServerUrl,
        isSettingsPreview: false,
        strings: {
          finished: `${getString(
            'readerScreen.finished',
          )}: ${chapter.name?.trim()}`,
          nextChapter: getString('readerScreen.nextChapter', {
            name: nextChapter?.name,
          }),
          noNextChapter: getString('readerScreen.noNextChapter'),
        },
      }),
    }),
    [
      batteryLevel,
      chapter,
      chapterGeneralSettingsRef,
      getNextChapterScreenVisible,
      getPendingScrollPosition,
      html,
      nextChapter,
      novel,
      plugin?.imageRequestInit,
      plugin?.site,
      pluginCustomCSS,
      pluginCustomJS,
      prevChapter,
      readerBottomInset,
      readerDir,
      readerSettingsRef,
      theme,
    ],
  );

  return (
    <WebView
      ref={webViewRef}
      style={{ backgroundColor: readerSettings.theme }}
      allowFileAccess
      originWhitelist={['*']}
      scalesPageToFit
      showsVerticalScrollIndicator={false}
      javaScriptEnabled
      userAgent={getUserAgent()}
      webviewDebuggingEnabled={__DEV__}
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
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
      onMessage={event => handleMessage(event.nativeEvent.data)}
      source={source}
    />
  );
};

export default memo(WebViewReader);
