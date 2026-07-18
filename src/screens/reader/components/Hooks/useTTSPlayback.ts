import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import TTSPlaybackManager, { TTSPlaybackCallbacks } from './TTSPlaybackManager';
import type { WebViewPostEvent } from './webViewEvents';

type UseTTSPlaybackOptions = TTSPlaybackCallbacks & {
  readerSettingsRef: React.RefObject<ChapterReaderSettings>;
};

export default function useTTSPlayback({
  readerSettingsRef,
  ...callbacks
}: UseTTSPlaybackOptions) {
  const sessionIdRef = useRef(Symbol('tts-playback-session'));
  const callbacksRef = useRef(callbacks);
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(0);
  callbacksRef.current = callbacks;

  const getCallbacks = useCallback(
    (onWillPlay?: () => void): TTSPlaybackCallbacks => ({
      onWillPlay,
      onStart: () => callbacksRef.current.onStart?.(),
      onDone: () => callbacksRef.current.onDone?.(),
      onError: (error, message) =>
        callbacksRef.current.onError?.(error, message),
      onInterrupted: () => callbacksRef.current.onInterrupted?.(),
    }),
    [],
  );

  const playText = useCallback(
    (text: string, onWillPlay?: () => void) => {
      const normalizedText = text.trim();
      if (!normalizedText) return false;
      return TTSPlaybackManager.speak(
        sessionIdRef.current,
        normalizedText,
        readerSettingsRef.current.tts || {},
        getCallbacks(onWillPlay),
      );
    },
    [getCallbacks, readerSettingsRef],
  );

  const handleQueue = useCallback((event: WebViewPostEvent) => {
    const payload = event.data as
      | { queue?: unknown; startIndex?: unknown }
      | undefined;
    queueRef.current = Array.isArray(payload?.queue)
      ? payload.queue.filter(
          (item): item is string =>
            typeof item === 'string' && item.trim().length > 0,
        )
      : [];
    queueIndexRef.current =
      typeof payload?.startIndex === 'number' ? payload.startIndex : 0;
  }, []);

  const handleSpeak = useCallback(
    (event: WebViewPostEvent, onWillPlay?: () => void) => {
      if (typeof event.data !== 'string') return false;
      if (typeof event.index === 'number') {
        queueIndexRef.current = event.index;
      }
      const started = playText(event.data, onWillPlay);
      if (started && readerSettingsRef.current.tts?.engine === 'tiktok') {
        TTSPlaybackManager.updateQueue(
          sessionIdRef.current,
          queueRef.current.slice(queueIndexRef.current + 1),
          readerSettingsRef.current.tts,
        );
      }
      return started;
    },
    [playText, readerSettingsRef],
  );

  const pause = useCallback(
    () => TTSPlaybackManager.pause(sessionIdRef.current),
    [],
  );
  const stop = useCallback(() => {
    TTSPlaybackManager.stop(sessionIdRef.current);
    queueRef.current = [];
    queueIndexRef.current = 0;
  }, []);
  const stopAll = useCallback(() => TTSPlaybackManager.stopAll(), []);

  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({ handleQueue, handleSpeak, pause, playText, stop, stopAll }),
    [handleQueue, handleSpeak, pause, playText, stop, stopAll],
  );
}
