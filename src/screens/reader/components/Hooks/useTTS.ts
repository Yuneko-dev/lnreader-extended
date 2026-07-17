import type { ChapterInfo, NovelInfo } from '@database/types';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import { showToast } from '@utils/showToast';
import {
  dismissTTSNotification,
  showTTSNotification,
  ttsMediaEmitter,
  updateTTSNotification,
  updateTTSPlaybackState,
  updateTTSProgress,
} from '@utils/ttsNotification';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, NativeEventEmitter, NativeModules } from 'react-native';
import type WebView from 'react-native-webview';

import type useReadingTime from './useReadingTime';
import type { WebViewPostEvent } from './webViewEvents';

const { TikTokTTS } = NativeModules;
const tiktokTTSEmitter = TikTokTTS ? new NativeEventEmitter(TikTokTTS) : null;
const stopNativeEngines = () => {
  Speech.stop();
  TikTokTTS?.stop();
};

type ReadingTimeController = ReturnType<typeof useReadingTime>;

type UseTTSOptions = {
  webViewRef: React.RefObject<WebView | null>;
  novel: NovelInfo;
  chapter: ChapterInfo;
  readerSettingsRef: React.RefObject<ChapterReaderSettings>;
  readingTime: ReadingTimeController;
};

export default function useTTS({
  webViewRef,
  novel,
  chapter,
  readerSettingsRef,
  readingTime,
}: UseTTSOptions) {
  const autoStartTTSRef = useRef(false);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsQueueIndexRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isTTSReadingRef } = readingTime;
  const notificationInfo = useMemo(
    () => ({
      novelName: novel.name || 'Unknown',
      chapterName: chapter.name,
      coverUri: novel.cover || '',
      isPlaying: true,
    }),
    [chapter.name, novel.cover, novel.name],
  );
  const clearAutoStartTimer = useCallback(() => {
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
  }, []);
  const resetAfterPlaybackError = useCallback(() => {
    autoStartTTSRef.current = false;
    clearAutoStartTimer();
    ttsQueueRef.current = [];
    ttsQueueIndexRef.current = 0;
    if (appStateRef.current === 'active') {
      readingTime.setTTSReading(false);
    } else {
      readingTime.stopTTSForBackground();
    }
    dismissTTSNotification();
    webViewRef.current?.injectJavaScript('tts.stop?.()');
  }, [clearAutoStartTimer, readingTime, webViewRef]);

  useEffect(() => {
    const inject = (script: string) =>
      webViewRef.current?.injectJavaScript(script);
    const listeners = [
      ttsMediaEmitter.addListener('TTSPlay', () =>
        inject('if (window.tts && !tts.reading) { tts.resume(); }'),
      ),
      ttsMediaEmitter.addListener('TTSPause', () =>
        inject('if (window.tts && tts.reading) { tts.pause(); }'),
      ),
      ttsMediaEmitter.addListener('TTSStop', () =>
        inject('if (window.tts) { tts.stop(); }'),
      ),
      ttsMediaEmitter.addListener('TTSRewind', () =>
        inject('if (window.tts && tts.started) { tts.rewind(); }'),
      ),
      ttsMediaEmitter.addListener('TTSPrev', () =>
        inject(`
          if (window.tts && window.reader && window.reader.prevChapter) {
            window.reader.post({ type: 'prev', autoStartTTS: true });
          }`),
      ),
      ttsMediaEmitter.addListener('TTSNext', () =>
        inject(`
          if (window.tts && window.reader && window.reader.nextChapter) {
            window.reader.post({ type: 'next', autoStartTTS: true });
          }`),
      ),
      ttsMediaEmitter.addListener(
        'TTSSeekTo',
        ({ position }: { position: number }) => {
          if (Number.isFinite(position)) {
            inject(
              `if (window.tts && tts.started) { tts.seekTo(${position}); }`,
            );
          }
        },
      ),
    ];
    return () => listeners.forEach(listener => listener.remove());
  }, [webViewRef]);

  useEffect(() => {
    if (isTTSReadingRef.current) {
      updateTTSNotification(notificationInfo);
    }
  }, [isTTSReadingRef, notificationInfo]);

  useEffect(
    () => () => {
      clearAutoStartTimer();
      dismissTTSNotification();
    },
    [clearAutoStartTimer],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        readingTime.start();
        return;
      }

      readingTime.pause();
      if (isTTSReadingRef.current) {
        stopNativeEngines();
        readingTime.stopTTSForBackground();
        ttsQueueRef.current = [];
        ttsQueueIndexRef.current = 0;
        dismissTTSNotification();
        webViewRef.current?.injectJavaScript('if (window.tts) { tts.stop(); }');
      }
    });
    return () => subscription.remove();
  }, [isTTSReadingRef, readingTime, webViewRef]);

  useEffect(() => {
    if (!tiktokTTSEmitter) return;

    const onStart = tiktokTTSEmitter.addListener('TikTokTTS_onStart', () => {
      webViewRef.current?.injectJavaScript('tts.setLoading(true)');
    });
    const onDone = tiktokTTSEmitter.addListener('TikTokTTS_onDone', () => {
      webViewRef.current?.injectJavaScript('tts.setLoading(false)');
      if (appStateRef.current === 'active') {
        webViewRef.current?.injectJavaScript('tts.next?.()');
      }
    });
    const onError = tiktokTTSEmitter.addListener(
      'TikTokTTS_onError',
      (error: { message?: string }) => {
        webViewRef.current?.injectJavaScript('tts.setLoading(false)');
        resetAfterPlaybackError();
        // eslint-disable-next-line no-console
        console.error('TikTokTTS Error:', error.message);
      },
    );
    return () => {
      onStart.remove();
      onDone.remove();
      onError.remove();
    };
  }, [resetAfterPlaybackError, webViewRef]);

  const speakText = useCallback(
    (text: string) => {
      const ttsSettings = readerSettingsRef.current?.tts;
      if (ttsSettings?.engine === 'tiktok') {
        const voice = ttsSettings.voice?.identifier;
        if (!voice) {
          showToast('TikTok TTS: No voice selected');
          return;
        }
        TikTokTTS?.speak(
          text,
          voice,
          ttsSettings.queueSize || 3,
          ttsSettings.rate || 1,
          ttsSettings.pitch || 1,
        );
        return;
      }

      Speech.speak(text, {
        onDone() {
          if (appStateRef.current === 'active') {
            webViewRef.current?.injectJavaScript('tts.next?.()');
          }
        },
        onError: resetAfterPlaybackError,
        voice: ttsSettings?.voice?.identifier,
        pitch: ttsSettings?.pitch || 1,
        rate: ttsSettings?.rate || 1,
      });
    },
    [readerSettingsRef, resetAfterPlaybackError, webViewRef],
  );

  const handleQueue = useCallback(
    (event: WebViewPostEvent) => {
      const payload = event.data as
        | { queue?: unknown; startIndex?: unknown }
        | undefined;
      const queue = Array.isArray(payload?.queue)
        ? payload.queue.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : [];
      ttsQueueRef.current = queue;
      ttsQueueIndexRef.current =
        typeof payload?.startIndex === 'number' ? payload.startIndex : 0;

      if (readerSettingsRef.current?.tts?.engine === 'tiktok') {
        const voice = readerSettingsRef.current.tts.voice?.identifier;
        if (voice) {
          TikTokTTS?.updateQueue(queue.slice(ttsQueueIndexRef.current), voice);
        }
      }
    },
    [readerSettingsRef],
  );

  const handleSpeak = useCallback(
    (event: WebViewPostEvent) => {
      if (typeof event.data !== 'string' || !event.data) {
        webViewRef.current?.injectJavaScript('tts.next?.()');
        return;
      }

      const ttsSettings = readerSettingsRef.current?.tts;
      if (ttsSettings?.engine === 'tiktok') {
        if (!TikTokTTS) {
          showToast('TikTok TTS is unavailable');
          resetAfterPlaybackError();
          return;
        }
        if (!ttsSettings.voice?.identifier) {
          showToast('TikTok TTS: No voice selected');
          resetAfterPlaybackError();
          return;
        }
      }

      if (typeof event.index === 'number') {
        ttsQueueIndexRef.current = event.index;
      }
      if (!isTTSReadingRef.current) {
        readingTime.setTTSReading(true);
        showTTSNotification(notificationInfo);
      } else {
        updateTTSNotification(notificationInfo);
      }
      if (
        typeof event.index === 'number' &&
        typeof event.total === 'number' &&
        event.total > 0
      ) {
        updateTTSProgress(event.index, event.total);
      }
      if (readerSettingsRef.current?.tts?.engine === 'tiktok') {
        const voice = readerSettingsRef.current.tts.voice?.identifier;
        if (voice) {
          TikTokTTS?.updateQueue(
            ttsQueueRef.current.slice(ttsQueueIndexRef.current + 1),
            voice,
          );
        }
      }
      speakText(event.data);
    },
    [
      isTTSReadingRef,
      notificationInfo,
      readerSettingsRef,
      readingTime,
      resetAfterPlaybackError,
      speakText,
      webViewRef,
    ],
  );

  const handlePause = useCallback(() => {
    Speech.stop();
    TikTokTTS?.pause();
  }, []);

  const handleStop = useCallback(() => {
    stopNativeEngines();
    if (!autoStartTTSRef.current) {
      clearAutoStartTimer();
      readingTime.setTTSReading(false);
      ttsQueueRef.current = [];
      ttsQueueIndexRef.current = 0;
      dismissTTSNotification();
    }
  }, [clearAutoStartTimer, readingTime]);

  const handleState = useCallback(
    (event: WebViewPostEvent) => {
      if (typeof event.data !== 'object' || event.data === null) return;
      const isReading =
        (event.data as { isReading?: boolean }).isReading === true;
      readingTime.setTTSReading(isReading);
      updateTTSPlaybackState(isReading);
    },
    [readingTime],
  );

  const stopNativePlayback = useCallback(() => {
    stopNativeEngines();
  }, []);

  const scheduleAutoStart = useCallback(() => {
    clearAutoStartTimer();
    autoStartTTSRef.current = true;
  }, [clearAutoStartTimer]);

  const handleLoadEnd = useCallback(() => {
    if (!autoStartTTSRef.current) return;
    autoStartTTSRef.current = false;
    clearAutoStartTimer();
    autoStartTimerRef.current = setTimeout(() => {
      autoStartTimerRef.current = null;
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
        })();`);
    }, 300);
  }, [clearAutoStartTimer, webViewRef]);

  return useMemo(
    () => ({
      handleLoadEnd,
      handlePause,
      handleQueue,
      handleSpeak,
      handleState,
      handleStop,
      scheduleAutoStart,
      stopNativePlayback,
    }),
    [
      handleLoadEnd,
      handlePause,
      handleQueue,
      handleSpeak,
      handleState,
      handleStop,
      scheduleAutoStart,
      stopNativePlayback,
    ],
  );
}
