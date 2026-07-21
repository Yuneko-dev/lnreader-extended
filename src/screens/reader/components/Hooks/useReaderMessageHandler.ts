import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useRef } from 'react';

import type { NativeFindResult } from '../../hooks/useNativeChapterSearch';
import type useTTS from './useTTS';
import { parseWebViewEvent } from './webViewEvents';

type TTSController = ReturnType<typeof useTTS>;

type UseReaderMessageHandlerOptions = {
  documentId: number;
  onPress: () => void;
  onReaderReady: () => void;
  onFindResult: (result: NativeFindResult) => void;
  navigateChapter: (direction: 'NEXT' | 'PREV') => void;
  saveProgress: (progress: number) => void;
  onProgress?: (progress: number) => void;
  resetAutoScroll: () => void;
  refetch: () => void;
  tts: TTSController;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export default function useReaderMessageHandler({
  documentId,
  onPress,
  onReaderReady,
  onFindResult,
  navigateChapter,
  saveProgress,
  onProgress,
  resetAutoScroll,
  refetch,
  tts,
}: UseReaderMessageHandlerOptions) {
  const nextChapterScreenVisible = useRef(false);
  const pendingScrollPosition = useRef<'start' | 'end' | null>(null);
  const getNextChapterScreenVisible = useCallback(
    () => nextChapterScreenVisible.current,
    [],
  );
  const getPendingScrollPosition = useCallback(
    () => pendingScrollPosition.current,
    [],
  );
  const clearPendingScrollPosition = useCallback(() => {
    pendingScrollPosition.current = null;
  }, []);

  const handleMessage = useCallback(
    (payload: string) => {
      const event = parseWebViewEvent(payload);
      // A replaced document can still flush queued messages during navigation.
      if (!event || event.documentId !== documentId) return;

      switch (event.type) {
        case 'reader-ready':
          onReaderReady();
          nextChapterScreenVisible.current = false;
          clearPendingScrollPosition();
          tts.handleLoadEnd();
          break;
        case 'user-interaction':
          resetAutoScroll();
          break;
        case 'tts-queue':
          tts.handleQueue(event);
          break;
        case 'hide':
          onPress();
          break;
        case 'next':
          nextChapterScreenVisible.current = true;
          if (event.initialScrollPosition) {
            pendingScrollPosition.current = event.initialScrollPosition;
          }
          if (event.autoStartTTS) {
            tts.scheduleAutoStart();
          }
          navigateChapter('NEXT');
          break;
        case 'prev':
          if (event.initialScrollPosition) {
            pendingScrollPosition.current = event.initialScrollPosition;
          }
          if (event.autoStartTTS) {
            tts.scheduleAutoStart();
          }
          navigateChapter('PREV');
          break;
        case 'save':
          if (typeof event.data === 'number') {
            onProgress?.(event.data);
            saveProgress(event.data);
          }
          break;
        case 'find-result':
          if (
            isRecord(event.data) &&
            typeof event.data.query === 'string' &&
            typeof event.data.activeMatchOrdinal === 'number' &&
            typeof event.data.numberOfMatches === 'number' &&
            typeof event.data.isDoneCounting === 'boolean'
          ) {
            onFindResult({
              query: event.data.query,
              current:
                event.data.numberOfMatches > 0
                  ? event.data.activeMatchOrdinal + 1
                  : 0,
              total: event.data.numberOfMatches,
              isDoneCounting: event.data.isDoneCounting,
            });
          }
          break;
        case 'speak':
          tts.handleSpeak(event);
          break;
        case 'pause-speak':
          tts.handlePause();
          break;
        case 'stop-speak':
          tts.handleStop();
          break;
        case 'tts-state':
          tts.handleState(event);
          break;
        case 'refetch':
          refetch();
          break;
        case 'video-fullscreen-enter':
          ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE,
          ).catch(() => {});
          break;
        case 'video-fullscreen-exit':
          ScreenOrientation.unlockAsync().catch(() => {});
          break;
        case 'console': {
          const method = ['debug', 'error', 'info', 'log', 'warn'].includes(
            event.method ?? '',
          )
            ? (event.method as 'debug' | 'error' | 'info' | 'log' | 'warn')
            : 'log';
          // eslint-disable-next-line no-console
          console[method]('[WebView]', ...(event.args ?? []));
          break;
        }
        case 'error':
          // eslint-disable-next-line no-console
          console.error('[WebView Error]', event.msg);
          break;
        default:
          // eslint-disable-next-line no-console
          console.warn(`Unknown event: ${event.type}`, event);
      }
    },
    [
      clearPendingScrollPosition,
      documentId,
      navigateChapter,
      onFindResult,
      onPress,
      onReaderReady,
      onProgress,
      refetch,
      resetAutoScroll,
      saveProgress,
      tts,
    ],
  );

  return {
    getNextChapterScreenVisible,
    getPendingScrollPosition,
    handleMessage,
  };
}
