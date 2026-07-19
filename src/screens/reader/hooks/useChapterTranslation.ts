import { ChapterInfo, NovelInfo } from '@database/types';
import { APP_SETTINGS, AppSettings } from '@hooks/persisted/useSettings';
import {
  getTranslateConfigSnapshot,
  TranslateConfigSnapshot,
} from '@services/translate/getTranslateConfig';
import { TranslateManager } from '@services/translate/TranslateManager';
import { getString } from '@strings/translations';
import { getMMKVObject } from '@utils/mmkv/mmkv';
import { showToast } from '@utils/showToast';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import { sanitizeChapterText } from '../utils/sanitizeChapterText';

type ContentMode = 'original' | 'translated' | 'offline';
type TranslationActivity = 'idle' | 'queued' | 'translating';

interface TranslationViewState {
  activity: TranslationActivity;
  contentMode: ContentMode;
  progress: number;
}

interface ChapterTextCache {
  read: (chapterId: number) => string | Promise<string> | undefined;
}

interface ForegroundOperation {
  chapterId: number;
  controller: AbortController;
  kind: 'translate' | 'retranslate';
  promise: Promise<void>;
  token: symbol;
}

interface BackgroundJob {
  chapterId: number;
  configKey: string;
  controller: AbortController;
  progress: number;
  promise: Promise<void>;
  token: symbol;
}

interface CachedTranslation {
  chapterId: number;
  configKey: string;
  html: string;
}

interface ActivateChapterOptions {
  allowPrefetch: boolean;
  chapter: ChapterInfo;
  isOffline: boolean;
  nextChapter?: ChapterInfo;
  sourceHtml: string;
}

interface UseChapterTranslationOptions {
  chapterTextCache: ChapterTextCache;
  loadChapterText: (id: number, path: string) => Promise<string>;
  novel: NovelInfo;
}

const initialViewState: TranslationViewState = {
  activity: 'idle',
  contentMode: 'original',
  progress: 0,
};

const canRetranslateChapter = (
  state: TranslationViewState,
  hasForegroundOperation: boolean,
  hasOriginalHtml: boolean,
) =>
  state.contentMode === 'translated' &&
  state.activity === 'idle' &&
  !hasForegroundOperation &&
  hasOriginalHtml;

export default function useChapterTranslation({
  chapterTextCache,
  loadChapterText,
  novel,
}: UseChapterTranslationOptions) {
  const [chapterText, setChapterText] = useState('');
  const [viewState, setViewState] = useState(initialViewState);
  const viewStateRef = useRef(viewState);
  const mountedRef = useRef(true);
  const currentChapterIdRef = useRef<number | null>(null);
  const originalHtmlRef = useRef('');
  const nextChapterRef = useRef<ChapterInfo | undefined>(undefined);
  const allowPrefetchRef = useRef(false);
  const foregroundRef = useRef<ForegroundOperation | undefined>(undefined);
  const backgroundRef = useRef<BackgroundJob | undefined>(undefined);
  const cacheRef = useRef<CachedTranslation | undefined>(undefined);

  const updateViewState = useCallback(
    (update: Partial<TranslationViewState>) => {
      if (!mountedRef.current) return;
      const nextState = { ...viewStateRef.current, ...update };
      viewStateRef.current = nextState;
      setViewState(nextState);
    },
    [],
  );

  const isCurrentForeground = useCallback(
    (operation: ForegroundOperation) =>
      mountedRef.current &&
      foregroundRef.current?.token === operation.token &&
      currentChapterIdRef.current === operation.chapterId &&
      !operation.controller.signal.aborted,
    [],
  );

  const cancelForeground = useCallback(() => {
    const operation = foregroundRef.current;
    if (!operation) return;

    foregroundRef.current = undefined;
    operation.controller.abort();
    if (currentChapterIdRef.current === operation.chapterId) {
      updateViewState({
        activity: 'idle',
        contentMode:
          operation.kind === 'retranslate' ? 'translated' : 'original',
        progress: 0,
      });
    }
  }, [updateViewState]);

  const cancelBackground = useCallback(
    (resetVisibleState = true) => {
      const job = backgroundRef.current;
      if (!job) return;

      backgroundRef.current = undefined;
      job.controller.abort();
      if (
        resetVisibleState &&
        currentChapterIdRef.current === job.chapterId &&
        !foregroundRef.current
      ) {
        updateViewState({
          activity: 'idle',
          contentMode: 'original',
          progress: 0,
        });
      }
    },
    [updateViewState],
  );

  const startBackgroundTranslateRef = useRef<
    (
      targetChapter: ChapterInfo,
      rawText: string,
      snapshot: TranslateConfigSnapshot,
    ) => Promise<void>
  >(() => Promise.resolve());

  const pretranslateNextChapter = useCallback(
    async (snapshot: TranslateConfigSnapshot) => {
      const sourceChapterId = currentChapterIdRef.current;
      const targetChapter = nextChapterRef.current;
      if (
        !mountedRef.current ||
        !sourceChapterId ||
        !targetChapter ||
        !allowPrefetchRef.current ||
        !snapshot.settings.autoTranslateNextChapter
      ) {
        return;
      }
      if (
        cacheRef.current?.chapterId === targetChapter.id &&
        cacheRef.current.configKey === snapshot.configKey
      ) {
        return;
      }
      if (
        backgroundRef.current?.chapterId === targetChapter.id &&
        backgroundRef.current.configKey === snapshot.configKey
      ) {
        return;
      }

      try {
        const rawText = await Promise.resolve(
          chapterTextCache.read(targetChapter.id) ??
            loadChapterText(targetChapter.id, targetChapter.path),
        );
        if (
          mountedRef.current &&
          currentChapterIdRef.current === sourceChapterId &&
          !foregroundRef.current
        ) {
          await startBackgroundTranslateRef.current?.(
            targetChapter,
            rawText,
            snapshot,
          );
        }
      } catch {
        // Chapter prefetch failure must not affect the current chapter.
      }
    },
    [chapterTextCache, loadChapterText],
  );

  const startBackgroundTranslate = useCallback(
    (
      targetChapter: ChapterInfo,
      rawText: string,
      snapshot: TranslateConfigSnapshot,
    ): Promise<void> => {
      if (!snapshot.settings.autoTranslateNextChapter) {
        return Promise.resolve();
      }
      const existingJob = backgroundRef.current;
      if (
        existingJob?.chapterId === targetChapter.id &&
        existingJob.configKey === snapshot.configKey
      ) {
        return existingJob.promise;
      }

      cancelBackground(false);
      const controller = new AbortController();
      const token = Symbol('background-translation');
      const sourceHtml = sanitizeChapterText(
        novel.pluginId,
        novel.name,
        targetChapter.name,
        rawText,
      );
      const job: BackgroundJob = {
        chapterId: targetChapter.id,
        configKey: snapshot.configKey,
        controller,
        progress: 0,
        promise: Promise.resolve(),
        token,
      };

      job.promise = (async () => {
        try {
          const translatedHtml = await TranslateManager.translateChapterHTML(
            sourceHtml,
            snapshot.config,
            progress => {
              if (
                backgroundRef.current?.token !== token ||
                controller.signal.aborted
              ) {
                return;
              }
              job.progress = progress;
              if (
                currentChapterIdRef.current === targetChapter.id &&
                !foregroundRef.current
              ) {
                updateViewState({ activity: 'translating', progress });
              }
            },
            controller.signal,
          );
          if (
            !mountedRef.current ||
            backgroundRef.current?.token !== token ||
            controller.signal.aborted
          ) {
            return;
          }

          cacheRef.current = {
            chapterId: targetChapter.id,
            configKey: snapshot.configKey,
            html: translatedHtml,
          };
          if (currentChapterIdRef.current === targetChapter.id) {
            setChapterText(translatedHtml);
            updateViewState({
              activity: 'idle',
              contentMode: 'translated',
              progress: 100,
            });
            cacheRef.current = undefined;
            if (!foregroundRef.current) {
              pretranslateNextChapter(snapshot).catch(() => {});
            }
          }
        } catch {
          if (
            mountedRef.current &&
            backgroundRef.current?.token === token &&
            currentChapterIdRef.current === targetChapter.id &&
            !foregroundRef.current
          ) {
            updateViewState({
              activity: 'idle',
              contentMode: 'original',
              progress: 0,
            });
          }
        } finally {
          if (backgroundRef.current?.token === token) {
            backgroundRef.current = undefined;
          }
        }
      })();
      backgroundRef.current = job;
      return job.promise;
    },
    [
      cancelBackground,
      novel.name,
      novel.pluginId,
      pretranslateNextChapter,
      updateViewState,
    ],
  );
  startBackgroundTranslateRef.current = startBackgroundTranslate;

  const runForegroundTranslate = useCallback(
    (
      kind: ForegroundOperation['kind'],
      sourceHtml: string,
      snapshot: TranslateConfigSnapshot,
      waitFor?: Promise<void>,
    ) => {
      const chapterId = currentChapterIdRef.current;
      if (!chapterId || foregroundRef.current) return;

      const controller = new AbortController();
      const token = Symbol(`foreground-${kind}`);
      const operation: ForegroundOperation = {
        chapterId,
        controller,
        kind,
        promise: Promise.resolve(),
        token,
      };
      foregroundRef.current = operation;
      updateViewState({
        activity: waitFor ? 'queued' : 'translating',
        progress: 0,
      });

      operation.promise = (async () => {
        try {
          if (waitFor) await waitFor;
          if (!isCurrentForeground(operation)) return;

          updateViewState({ activity: 'translating', progress: 0 });
          if (kind === 'retranslate') {
            showToast(getString('readerScreen.retranslating'));
          }
          const translatedHtml = await TranslateManager.translateChapterHTML(
            sourceHtml,
            snapshot.config,
            progress => {
              if (isCurrentForeground(operation)) {
                updateViewState({ progress });
              }
            },
            controller.signal,
          );
          if (!isCurrentForeground(operation)) return;

          setChapterText(translatedHtml);
          updateViewState({
            activity: 'idle',
            contentMode: 'translated',
            progress: 100,
          });
          foregroundRef.current = undefined;
          pretranslateNextChapter(snapshot).catch(() => {});
        } catch (error) {
          if (!isCurrentForeground(operation)) return;
          showToast(error instanceof Error ? error.message : String(error));
          updateViewState({
            activity: 'idle',
            contentMode: kind === 'retranslate' ? 'translated' : 'original',
            progress: 0,
          });
        } finally {
          if (foregroundRef.current?.token === token) {
            foregroundRef.current = undefined;
          }
        }
      })();
    },
    [isCurrentForeground, pretranslateNextChapter, updateViewState],
  );

  const prepareNavigation = useCallback(
    (targetChapterId: number) => {
      cancelForeground();
      if (backgroundRef.current?.chapterId !== targetChapterId) {
        cancelBackground(false);
      }
    },
    [cancelBackground, cancelForeground],
  );

  const activateChapter = useCallback(
    ({
      allowPrefetch,
      chapter,
      isOffline,
      nextChapter,
      sourceHtml,
    }: ActivateChapterOptions) => {
      cancelForeground();
      currentChapterIdRef.current = chapter.id;
      nextChapterRef.current = nextChapter;
      allowPrefetchRef.current = allowPrefetch;
      originalHtmlRef.current = isOffline ? '' : sourceHtml;

      const snapshot = getTranslateConfigSnapshot();
      if (
        backgroundRef.current?.chapterId === chapter.id &&
        backgroundRef.current.configKey !== snapshot.configKey
      ) {
        cancelBackground(false);
      } else if (
        backgroundRef.current &&
        backgroundRef.current.chapterId !== chapter.id
      ) {
        cancelBackground(false);
      }

      if (isOffline) {
        cancelBackground(false);
        cacheRef.current = undefined;
        setChapterText(sourceHtml);
        updateViewState({
          activity: 'idle',
          contentMode: 'offline',
          progress: 100,
        });
        return;
      }

      const cached = cacheRef.current;
      if (
        cached?.chapterId === chapter.id &&
        cached.configKey === snapshot.configKey
      ) {
        cacheRef.current = undefined;
        setChapterText(cached.html);
        updateViewState({
          activity: 'idle',
          contentMode: 'translated',
          progress: 100,
        });
        pretranslateNextChapter(snapshot).catch(() => {});
        return;
      }
      if (cached?.chapterId === chapter.id) cacheRef.current = undefined;

      setChapterText(sourceHtml);
      const attachedBackground =
        backgroundRef.current?.chapterId === chapter.id
          ? backgroundRef.current
          : undefined;
      updateViewState({
        activity: attachedBackground ? 'translating' : 'idle',
        contentMode: 'original',
        progress: attachedBackground?.progress ?? 0,
      });
    },
    [
      cancelBackground,
      cancelForeground,
      pretranslateNextChapter,
      updateViewState,
    ],
  );

  const revertTranslation = useCallback(() => {
    if (viewStateRef.current.contentMode === 'offline') return;
    cancelForeground();
    cancelBackground(false);
    cacheRef.current = undefined;
    if (!originalHtmlRef.current) return;
    setChapterText(originalHtmlRef.current);
    updateViewState({
      activity: 'idle',
      contentMode: 'original',
      progress: 0,
    });
  }, [cancelBackground, cancelForeground, updateViewState]);

  const translateChapter = useCallback(() => {
    const currentState = viewStateRef.current;
    if (currentState.contentMode === 'offline') return;
    if (currentState.activity !== 'idle') {
      if (foregroundRef.current) cancelForeground();
      else cancelBackground();
      return;
    }
    if (currentState.contentMode === 'translated') {
      revertTranslation();
      return;
    }
    if (!originalHtmlRef.current) return;
    runForegroundTranslate(
      'translate',
      originalHtmlRef.current,
      getTranslateConfigSnapshot(),
    );
  }, [
    cancelBackground,
    cancelForeground,
    revertTranslation,
    runForegroundTranslate,
  ]);

  const retranslateChapter = useCallback(() => {
    const currentState = viewStateRef.current;
    if (
      !canRetranslateChapter(
        currentState,
        Boolean(foregroundRef.current),
        Boolean(originalHtmlRef.current),
      )
    ) {
      return;
    }

    const appSettings = getMMKVObject<AppSettings>(APP_SETTINGS);
    if (!appSettings?.disableHapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const backgroundPromise = backgroundRef.current?.promise;
    if (backgroundPromise) {
      showToast(getString('readerScreen.retranslateQueued'));
    }
    runForegroundTranslate(
      'retranslate',
      originalHtmlRef.current,
      getTranslateConfigSnapshot(),
      backgroundPromise,
    );
  }, [runForegroundTranslate]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      foregroundRef.current?.controller.abort();
      backgroundRef.current?.controller.abort();
      foregroundRef.current = undefined;
      backgroundRef.current = undefined;
      cacheRef.current = undefined;
    },
    [],
  );

  return {
    activateChapter,
    canRetranslate: canRetranslateChapter(
      viewState,
      Boolean(foregroundRef.current),
      Boolean(originalHtmlRef.current),
    ),
    chapterText,
    isOfflineTranslated: viewState.contentMode === 'offline',
    isTranslated: viewState.contentMode !== 'original',
    isTranslating: viewState.activity !== 'idle',
    prepareNavigation,
    retranslateChapter,
    revertTranslation,
    translateChapter,
    translateProgress: viewState.progress,
  };
}
