import type { ChapterInfo, NovelInfo } from '@database/types';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import {
  dismissTTSNotification,
  showTTSNotification,
  ttsMediaEmitter,
  updateTTSNotification,
  updateTTSPlaybackState,
  updateTTSProgress,
} from '@utils/ttsNotification';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import type WebView from 'react-native-webview';

import type useReadingTime from './useReadingTime';
import useTTSPlayback from './useTTSPlayback';
import type { WebViewPostEvent } from './webViewEvents';

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
    if (appStateRef.current === 'active') {
      readingTime.setTTSReading(false);
    } else {
      readingTime.stopTTSForBackground();
    }
    dismissTTSNotification();
    webViewRef.current?.injectJavaScript('tts.setLoading(false); tts.stop?.()');
  }, [clearAutoStartTimer, readingTime, webViewRef]);

  const handlePlaybackError = useCallback(
    (error: 'tiktok-unavailable' | 'voice-required' | 'playback-error') => {
      if (error === 'tiktok-unavailable') {
        showToast(getString('readerSettings.tts.engineUnavailableError'));
      } else if (error === 'voice-required') {
        showToast(getString('readerSettings.tts.voiceRequiredError'));
      } else {
        showToast(getString('readerSettings.tts.playbackError'));
      }
      webViewRef.current?.injectJavaScript('tts.setLoading(false)');
      resetAfterPlaybackError();
    },
    [resetAfterPlaybackError, webViewRef],
  );

  const playback = useTTSPlayback({
    readerSettingsRef,
    // onStart fires when audio is actually playing; loading is shown from
    // onWillPlay (in handleSpeak) until then.
    onStart: () =>
      webViewRef.current?.injectJavaScript('tts.setLoading(false)'),
    onDone: () => {
      webViewRef.current?.injectJavaScript('tts.setLoading(false)');
      if (appStateRef.current === 'active') {
        webViewRef.current?.injectJavaScript('tts.next?.()');
      }
    },
    onError: handlePlaybackError,
    onInterrupted: resetAfterPlaybackError,
  });

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
        playback.stop();
        readingTime.stopTTSForBackground();
        dismissTTSNotification();
        webViewRef.current?.injectJavaScript('if (window.tts) { tts.stop(); }');
      }
    });
    return () => subscription.remove();
  }, [isTTSReadingRef, playback, readingTime, webViewRef]);

  const handleSpeak = useCallback(
    (event: WebViewPostEvent) => {
      if (typeof event.data !== 'string' || !event.data) {
        webViewRef.current?.injectJavaScript('tts.next?.()');
        return;
      }
      playback.handleSpeak(event, () => {
        webViewRef.current?.injectJavaScript('tts.setLoading(true)');
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
      });
    },
    [isTTSReadingRef, notificationInfo, playback, readingTime, webViewRef],
  );

  const handlePause = playback.pause;

  const handleStop = useCallback(() => {
    playback.stop();
    if (!autoStartTTSRef.current) {
      clearAutoStartTimer();
      readingTime.setTTSReading(false);
      dismissTTSNotification();
    }
  }, [clearAutoStartTimer, playback, readingTime]);

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

  const stopNativePlayback = playback.stopAll;

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
      handleQueue: playback.handleQueue,
      handleSpeak,
      handleState,
      handleStop,
      scheduleAutoStart,
      stopNativePlayback,
    }),
    [
      handleLoadEnd,
      handlePause,
      playback.handleQueue,
      handleSpeak,
      handleState,
      handleStop,
      scheduleAutoStart,
      stopNativePlayback,
    ],
  );
}
