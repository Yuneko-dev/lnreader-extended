import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  NativeEventEmitter,
  NativeModules,
  StatusBar,
} from 'react-native';
import WebView from 'react-native-webview';
import color from 'color';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';

import { getPlugin } from '@plugins/pluginManager';
import { getLocalServerUrl } from '@plugins/local/localServerManager';
import { MMKVStorage, getMMKVObject } from '@utils/mmkv/mmkv';
import {
  CHAPTER_GENERAL_SETTINGS,
  CHAPTER_READER_SETTINGS,
  ChapterGeneralSettings,
  ChapterReaderSettings,
  initialChapterGeneralSettings,
  initialChapterReaderSettings,
} from '@hooks/persisted/useSettings';
import { getBatteryLevelSync } from 'react-native-device-info';
import * as Speech from 'expo-speech';
import { PLUGIN_STORAGE } from '@utils/Storages';
import { useChapterContext } from '../ChapterContext';
import {
  showTTSNotification,
  updateTTSNotification,
  updateTTSPlaybackState,
  updateTTSProgress,
  dismissTTSNotification,
  ttsMediaEmitter,
} from '@utils/ttsNotification';
import { addReadDuration } from '@database/queries/ChapterQueries';

type WebViewPostEvent = {
  type: string;
  data?: { [key: string]: unknown };
  autoStartTTS?: boolean;
  index?: number;
  total?: number;
};

type WebViewReaderProps = {
  onPress(): void;
};

const onLogMessage = (payload: { nativeEvent: { data: string } }) => {
  try {
    const dataPayload = JSON.parse(payload.nativeEvent.data);
    if (dataPayload) {
      if (dataPayload.type === 'console') {
        console[dataPayload.method as 'log'](`[WebView]`, ...dataPayload.args);
      } else if (dataPayload.type === 'error') {
        console.error(`[WebView Error]`, dataPayload.msg);
      }
    }
  } catch {
    // Ignore unparseable messages
  }
};

const { RNDeviceInfo } = NativeModules;
const deviceInfoEmitter = new NativeEventEmitter(RNDeviceInfo);

const assetsUriPrefix = __DEV__
  ? 'http://localhost:8081/assets'
  : 'file:///android_asset';

const WebViewReader: React.FC<WebViewReaderProps> = ({ onPress }) => {
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
  } = useChapterContext();
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  // Use state for settings so they update when MMKV changes
  const [readerSettings, setReaderSettings] = useState<ChapterReaderSettings>(
    () =>
      getMMKVObject<ChapterReaderSettings>(CHAPTER_READER_SETTINGS) ||
      initialChapterReaderSettings,
  );
  const chapterGeneralSettings = useMemo(
    () =>
      getMMKVObject<ChapterGeneralSettings>(CHAPTER_GENERAL_SETTINGS) ||
      initialChapterGeneralSettings,
    // needed to preserve settings during chapter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter.id],
  );
  const readerBottomInset = chapterGeneralSettings.fullScreenMode ? 0 : bottom;

  // Update readerSettings when chapter changes
  useEffect(() => {
    setReaderSettings(
      getMMKVObject<ChapterReaderSettings>(CHAPTER_READER_SETTINGS) ||
        initialChapterReaderSettings,
    );
  }, [chapter.id]);

  // Update battery level when chapter changes to ensure fresh value on navigation
  const batteryLevel = useMemo(() => getBatteryLevelSync(), []);
  const plugin = getPlugin(novel?.pluginId);
  const pluginCustomJS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.js`;
  const pluginCustomCSS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.css`;
  const nextChapterScreenVisible = useRef<boolean>(false);
  const autoStartTTSRef = useRef<boolean>(false);
  const isTTSReadingRef = useRef<boolean>(false);
  const readerSettingsRef = useRef<ChapterReaderSettings>(readerSettings);
  const appStateRef = useRef(AppState.currentState);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsQueueIndexRef = useRef<number>(0);

  // --- Reading time tracking ---
  const readStartTimeRef = useRef<number | null>(null);
  const accumulatedReadTimeRef = useRef<number>(0);
  const chapterIdForReadTimeRef = useRef<number>(chapter.id);

  // Start reading timer
  const startReadTimer = () => {
    if (!readStartTimeRef.current && !isTTSReadingRef.current) {
      readStartTimeRef.current = Date.now();
    }
  };

  // Pause reading timer and accumulate
  const pauseReadTimer = () => {
    if (readStartTimeRef.current) {
      const elapsed = Math.floor(
        (Date.now() - readStartTimeRef.current) / 1000,
      );
      accumulatedReadTimeRef.current += elapsed;
      readStartTimeRef.current = null;
    }
  };

  // Save accumulated reading time to DB and reset
  const saveReadTime = (chId: number) => {
    pauseReadTimer();
    const totalSeconds = accumulatedReadTimeRef.current;
    if (totalSeconds > 0) {
      addReadDuration(chId, totalSeconds).catch(() => {});
      accumulatedReadTimeRef.current = 0;
    }
  };

  // Start timer on mount
  useEffect(() => {
    startReadTimer();
    return () => {
      // Save on unmount (leaving reader)
      saveReadTime(chapterIdForReadTimeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track chapter changes — save read time for previous chapter
  useEffect(() => {
    if (chapterIdForReadTimeRef.current !== chapter.id) {
      saveReadTime(chapterIdForReadTimeRef.current);
      chapterIdForReadTimeRef.current = chapter.id;
      startReadTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  useEffect(() => {
    readerSettingsRef.current = readerSettings;
  }, [readerSettings]);

  useEffect(() => {
    const playListener = ttsMediaEmitter.addListener('TTSPlay', () => {
      webViewRef.current?.injectJavaScript(`
        if (window.tts && !tts.reading) { tts.resume(); }
      `);
    });
    const pauseListener = ttsMediaEmitter.addListener('TTSPause', () => {
      webViewRef.current?.injectJavaScript(`
        if (window.tts && tts.reading) { tts.pause(); }
      `);
    });
    const stopListener = ttsMediaEmitter.addListener('TTSStop', () => {
      webViewRef.current?.injectJavaScript(`
        if (window.tts) { tts.stop(); }
      `);
    });
    const rewindListener = ttsMediaEmitter.addListener('TTSRewind', () => {
      webViewRef.current?.injectJavaScript(`
        if (window.tts && tts.started) { tts.rewind(); }
      `);
    });
    const prevListener = ttsMediaEmitter.addListener('TTSPrev', () => {
      webViewRef.current?.injectJavaScript(`
        if (window.tts && window.reader && window.reader.prevChapter) {
          window.reader.post({ type: 'prev', autoStartTTS: true });
        }
      `);
    });
    const nextListener = ttsMediaEmitter.addListener('TTSNext', () => {
      webViewRef.current?.injectJavaScript(`
        if (window.tts && window.reader && window.reader.nextChapter) {
          window.reader.post({ type: 'next', autoStartTTS: true });
        }
      `);
    });
    const seekToListener = ttsMediaEmitter.addListener(
      'TTSSeekTo',
      (event: { position: number }) => {
        const position = event.position;
        webViewRef.current?.injectJavaScript(`
          if (window.tts && tts.started) { tts.seekTo(${position}); }
        `);
      },
    );
    return () => {
      playListener.remove();
      pauseListener.remove();
      stopListener.remove();
      rewindListener.remove();
      prevListener.remove();
      nextListener.remove();
      seekToListener.remove();
    };
  }, [webViewRef]);

  useEffect(() => {
    if (isTTSReadingRef.current) {
      updateTTSNotification({
        novelName: novel?.name || 'Unknown',
        chapterName: chapter.name,
        coverUri: novel?.cover || '',
        isPlaying: isTTSReadingRef.current,
      });
    }
  }, [novel?.name, novel?.cover, chapter.name]);

  useEffect(() => {
    return () => {
      dismissTTSNotification();
    };
  }, []);

  useEffect(() => {
    const mmkvListener = MMKVStorage.addOnValueChangedListener(key => {
      switch (key) {
        case CHAPTER_READER_SETTINGS:
          // Update local state with new settings
          const newSettings =
            getMMKVObject<ChapterReaderSettings>(CHAPTER_READER_SETTINGS) ||
            initialChapterReaderSettings;
          setReaderSettings(newSettings);

          // Stop any currently playing speech
          Speech.stop();

          // Update WebView settings
          webViewRef.current?.injectJavaScript(
            `
            reader.readerSettings.val = ${MMKVStorage.getString(
              CHAPTER_READER_SETTINGS,
            )};
            // Auto-restart TTS if currently reading
            if (window.tts && tts.reading) {
              const currentElement = tts.currentElement;
              const wasReading = tts.reading;
              tts.stop();
              if (wasReading) {
                setTimeout(() => {
                  tts.start(currentElement);
                }, 100);
              }
            }
            `,
          );
          break;
        case CHAPTER_GENERAL_SETTINGS:
          const newGeneralSettings =
            getMMKVObject<ChapterGeneralSettings>(CHAPTER_GENERAL_SETTINGS) ||
            initialChapterGeneralSettings;
          webViewRef.current?.injectJavaScript(
            `reader.generalSettings.val = ${MMKVStorage.getString(
              CHAPTER_GENERAL_SETTINGS,
            )};
            document.documentElement.style.setProperty('--reader-bottomInset', '${
              newGeneralSettings.fullScreenMode ? 0 : bottom
            }px');`,
          );
          break;
      }
    });

    const subscription = deviceInfoEmitter.addListener(
      'RNDeviceInfo_batteryLevelDidChange',
      (level: number) => {
        webViewRef.current?.injectJavaScript(
          `reader.batteryLevel.val = ${level}`,
        );
      },
    );
    return () => {
      subscription.remove();
      mmkvListener.remove();
    };
  }, [bottom, webViewRef]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        // Resume reading timer (only if not TTS)
        if (!isTTSReadingRef.current) {
          startReadTimer();
        }
        if (isTTSReadingRef.current) {
          const index = ttsQueueIndexRef.current;
          webViewRef.current?.injectJavaScript(`
            if (window.tts && window.tts.allReadableElements) {
              const idx = ${index};
              if (idx < tts.allReadableElements.length) {
                tts.elementsRead = idx;
                tts.currentElement = tts.allReadableElements[idx];
                tts.prevElement = null;
                tts.started = true;
                tts.reading = true;
                tts.scrollToElement(tts.currentElement);
                tts.currentElement.classList.add('highlight');
              }
            }
          `);
        }
      } else {
        // Pause reading timer on background/inactive
        pauseReadTimer();
      }
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webViewRef]);

  const speakText = (text: string) => {
    Speech.speak(text, {
      onDone() {
        const isBackground =
          appStateRef.current === 'background' ||
          appStateRef.current === 'inactive';

        if (
          isBackground &&
          ttsQueueRef.current.length > 0 &&
          ttsQueueIndexRef.current + 1 < ttsQueueRef.current.length
        ) {
          const nextIndex = ttsQueueIndexRef.current + 1;
          const nextText = ttsQueueRef.current[nextIndex];
          if (nextText) {
            ttsQueueIndexRef.current = nextIndex;
            speakText(nextText);
            return;
          }
        }

        if (isBackground) {
          isTTSReadingRef.current = false;
          dismissTTSNotification();
          webViewRef.current?.injectJavaScript('tts.stop?.()');
          return;
        }

        webViewRef.current?.injectJavaScript('tts.next?.()');
      },
      voice: readerSettingsRef.current.tts?.voice?.identifier,
      pitch: readerSettingsRef.current.tts?.pitch || 1,
      rate: readerSettingsRef.current.tts?.rate || 1,
    });
  };
  const isRTL = plugin?.lang === 'Arabic' || plugin?.lang === 'Hebrew';
  const readerDir = isRTL ? 'rtl' : 'ltr';

  return (
    <WebView
      ref={webViewRef}
      style={{ backgroundColor: readerSettings.theme }}
      allowFileAccess={true}
      originWhitelist={['*']}
      scalesPageToFit={true}
      showsVerticalScrollIndicator={false}
      javaScriptEnabled={true}
      webviewDebuggingEnabled={__DEV__}
      onLoadEnd={() => {
        // Update battery level when WebView finishes loading
        const currentBatteryLevel = getBatteryLevelSync();
        webViewRef.current?.injectJavaScript(
          `if (window.reader && window.reader.batteryLevel) {
            window.reader.batteryLevel.val = ${currentBatteryLevel};
          }`,
        );

        if (autoStartTTSRef.current) {
          autoStartTTSRef.current = false;
          setTimeout(() => {
            webViewRef.current?.injectJavaScript(`
              (function() {
                if (window.tts && reader.generalSettings.val.TTSEnable) {
                  setTimeout(() => {
                    tts.start();
                    const controller = document.getElementById('TTS-Controller');
                    if (controller && controller.firstElementChild) {
                      controller.firstElementChild.innerHTML = pauseIcon;
                    }
                  }, 500);
                }
              })();
            `);
          }, 300);
        }
      }}
      onMessage={(ev: { nativeEvent: { data: string } }) => {
        onLogMessage(ev);
        let event: WebViewPostEvent;
        try {
          event = JSON.parse(ev.nativeEvent.data);
        } catch {
          // Non-JSON message, already handled by onLogMessage
          return;
        }
        switch (event.type) {
          case 'user-interaction':
            resetAutoScroll();
            break;
          case 'tts-queue': {
            const payload = event.data as
              | { queue?: unknown; startIndex?: unknown }
              | undefined;
            const queue = Array.isArray(payload?.queue)
              ? payload?.queue.filter(
                  (item): item is string =>
                    typeof item === 'string' && item.trim().length > 0,
                )
              : [];
            ttsQueueRef.current = queue;
            if (typeof payload?.startIndex === 'number') {
              ttsQueueIndexRef.current = payload.startIndex;
            } else {
              ttsQueueIndexRef.current = 0;
            }
            break;
          }
          case 'hide':
            onPress();
            break;
          case 'next':
            nextChapterScreenVisible.current = true;
            if (event.autoStartTTS) {
              autoStartTTSRef.current = true;
            }
            navigateChapter('NEXT');
            break;
          case 'prev':
            if (event.autoStartTTS) {
              autoStartTTSRef.current = true;
            }
            navigateChapter('PREV');
            break;
          case 'save':
            if (event.data && typeof event.data === 'number') {
              saveProgress(event.data);
            }
            break;
          case 'speak':
            if (event.data && typeof event.data === 'string') {
              if (typeof event.index === 'number') {
                ttsQueueIndexRef.current = event.index;
              }
              if (!isTTSReadingRef.current) {
                isTTSReadingRef.current = true;
                pauseReadTimer(); // Stop counting reading time during TTS
                showTTSNotification({
                  novelName: novel?.name || 'Unknown',
                  chapterName: chapter.name,
                  coverUri: novel?.cover || '',
                  isPlaying: true,
                });
              } else {
                updateTTSNotification({
                  novelName: novel?.name || 'Unknown',
                  chapterName: chapter.name,
                  coverUri: novel?.cover || '',
                  isPlaying: true,
                });
              }
              if (
                typeof event.index === 'number' &&
                typeof event.total === 'number' &&
                event.total > 0
              ) {
                updateTTSProgress(event.index, event.total);
              }
              speakText(event.data);
            } else {
              webViewRef.current?.injectJavaScript('tts.next?.()');
            }
            break;
          case 'pause-speak':
            Speech.stop();
            break;
          case 'stop-speak':
            Speech.stop();
            if (!autoStartTTSRef.current) {
              isTTSReadingRef.current = false;
              ttsQueueRef.current = [];
              ttsQueueIndexRef.current = 0;
              dismissTTSNotification();
              startReadTimer(); // Resume reading time tracking
            }
            break;
          case 'tts-state':
            if (event.data && typeof event.data === 'object') {
              const data = event.data as { isReading?: boolean };
              const isReading = data.isReading === true;
              const wasReading = isTTSReadingRef.current;
              isTTSReadingRef.current = isReading;
              updateTTSPlaybackState(isReading);
              // Toggle reading timer based on TTS state
              if (isReading && !wasReading) {
                pauseReadTimer();
              } else if (!isReading && wasReading) {
                startReadTimer();
              }
            }
            break;
        }
      }}
      source={{
        baseUrl: novel.isLocal
          ? `${getLocalServerUrl()}/local/${novel.id}/`
          : !chapter.isDownloaded
          ? plugin?.site
          : undefined,
        headers: plugin?.imageRequestInit?.headers,
        method: plugin?.imageRequestInit?.method,
        body: plugin?.imageRequestInit?.body,
        html: ` 
        <!DOCTYPE html>
          <html dir="${readerDir}">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
              ${
                !novel.isLocal
                  ? '<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">'
                  : ''
              }
              <link rel="stylesheet" href="${assetsUriPrefix}/css/index.css">
              <link rel="stylesheet" href="${assetsUriPrefix}/css/pageReader.css">
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
                --theme-surface-0-9: ${color(theme.surface)
                  .alpha(0.9)
                  .toString()};
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
 
              <link rel="stylesheet" href="${pluginCustomCSS}">
              <style>${readerSettings.customCSS}</style>
            </head>
            <body class="${
              chapterGeneralSettings.pageReader ? 'page-reader' : ''
            }">
              <div class="transition-chapter" style="transform: ${
                nextChapterScreenVisible.current
                  ? 'translateX(-100%)'
                  : 'translateX(0%)'
              };
              ${chapterGeneralSettings.pageReader ? '' : 'display: none'}"
              ">${chapter.name}</div>
              <div id="LNReader-chapter">
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

                var initialPageReaderConfig = ${JSON.stringify({
                  nextChapterScreenVisible: nextChapterScreenVisible.current,
                })};
 
 
                var initialReaderConfig = ${JSON.stringify({
                  readerSettings,
                  chapterGeneralSettings,
                  novel,
                  chapter,
                  nextChapter,
                  prevChapter,
                  batteryLevel,
                  autoSaveInterval: 2222,
                  DEBUG: __DEV__,
                  strings: {
                    finished:
                      getString('readerScreen.finished') +
                      ': ' +
                      chapter.name.trim(),
                    nextChapter: getString('readerScreen.nextChapter', {
                      name: nextChapter?.name,
                    }),
                    noNextChapter: getString('readerScreen.noNextChapter'),
                  },
                })}
              </script>
              <script src="${assetsUriPrefix}/js/polyfill-onscrollend.js"></script>
              <script src="${assetsUriPrefix}/js/icons.js"></script>
              <script src="${assetsUriPrefix}/js/van.js"></script>
              <script src="${assetsUriPrefix}/js/text-vibe.js"></script>
              <script src="${assetsUriPrefix}/js/core.js"></script>
              <script src="${assetsUriPrefix}/js/index.js"></script>
              <script src="${pluginCustomJS}"></script>
              <script>
                ${readerSettings.customJS}
              </script>
          </html>
          `,
      }}
    />
  );
};

export default memo(WebViewReader);
