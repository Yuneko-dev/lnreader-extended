import {
  getChapter as getDbChapter,
  getChapterCount,
  getNextChapter,
  getPrevChapter,
  insertChapters,
} from '@database/queries/ChapterQueries';
import { insertHistory } from '@database/queries/HistoryQueries';
import { ChapterInfo, NovelInfo } from '@database/types';
import {
  useChapterGeneralSettings,
  useLibrarySettings,
  useTrackedNovel,
  useTracker,
} from '@hooks/persisted';
import { fetchChapter, fetchPage } from '@services/plugin/fetch';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { NOVEL_STORAGE } from '@utils/Storages';
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TranslateManager } from '@services/translate/TranslateManager';
import { getMMKVObject } from '@utils/mmkv/mmkv';
import {
  TRANSLATE_SETTINGS,
  TranslateSettings,
  initialTranslateSettings,
} from '@hooks/persisted/useSettings';
import { sanitizeChapterText } from '../utils/sanitizeChapterText';
import { parseChapterNumber } from '@utils/parseChapterNumber';
import WebView from 'react-native-webview';
import { useFullscreenMode } from '@hooks';
import { AppState, Dimensions, NativeEventEmitter } from 'react-native';
import * as Speech from 'expo-speech';
import { defaultTo } from 'lodash-es';
import { showToast } from '@utils/showToast';
import { getString } from '@strings/translations';
import NativeVolumeButtonListener from '@specs/NativeVolumeButtonListener';
import NativeFile from '@specs/NativeFile';
import { useNovelContext } from '@screens/novel/NovelContext';
import { load } from 'cheerio';

const emmiter = new NativeEventEmitter(NativeVolumeButtonListener);

export default function useChapter(
  webViewRef: RefObject<WebView | null>,
  initialChapter: ChapterInfo,
  novel: NovelInfo,
) {
  const {
    setLastRead,
    markChapterRead,
    updateChapterProgress,
    chapterTextCache,
  } = useNovelContext();
  const [hidden, setHidden] = useState(true);
  const [chapter, setChapter] = useState(initialChapter);
  const [loading, setLoading] = useState(true);
  const [chapterText, setChapterText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isOfflineTranslated, setIsOfflineTranslated] = useState(false);
  const originalChapterText = useRef<string>('');
  const chapterIdRef = useRef<number>(initialChapter.id);

  // --- Background pre-translate state (persists across chapter navigation) ---
  // Cache: stores the translated HTML for exactly 1 pre-translated chapter
  const translatedChapterCache = useRef<Map<number, string>>(new Map());
  // Tracks the AbortController for the current foreground translation
  const currentTranslateAbort = useRef<AbortController | null>(null);
  // Tracks the AbortController for the background pre-translation
  const backgroundTranslateAbort = useRef<AbortController | null>(null);
  // Tracks which chapter ID is being background-translated
  const backgroundTranslatingChapterId = useRef<number | null>(null);
  // A callback ref to update state when background translation finishes for the current chapter
  const onBackgroundCompleteRef = useRef<
    ((chapterId: number, html: string) => void) | null
  >(null);

  const [[nextChapter, prevChapter], setAdjacentChapter] = useState<
    ChapterInfo[] | undefined[]
  >([]);
  const {
    autoScroll,
    autoScrollInterval,
    autoScrollOffset,
    useVolumeButtons,
    volumeButtonsOffset,
    pageReader: isPageReaderMode,
  } = useChapterGeneralSettings();
  const { incognitoMode } = useLibrarySettings();
  const [error, setError] = useState<string>();
  const { tracker } = useTracker();
  const { trackedNovel, updateAllTrackedNovels } = useTrackedNovel(novel.id);
  const { setImmersiveMode, showStatusAndNavBar } = useFullscreenMode();

  const connectVolumeButton = useCallback(() => {
    emmiter.addListener('VolumeUp', () => {
      if (isPageReaderMode) {
        webViewRef.current?.injectJavaScript(`(()=>{
          pageReader.movePage(pageReader.page.val - 1);
        })()`);
      } else {
        const offset = defaultTo(
          volumeButtonsOffset,
          Math.round(Dimensions.get('window').height * 0.75),
        );
        webViewRef.current?.injectJavaScript(`(()=>{
          window.scrollBy({top: -${offset}, behavior: 'smooth'})
        })()`);
      }
    });
    emmiter.addListener('VolumeDown', () => {
      if (isPageReaderMode) {
        webViewRef.current?.injectJavaScript(`(()=>{
          pageReader.movePage(pageReader.page.val + 1);
        })()`);
      } else {
        const offset = defaultTo(
          volumeButtonsOffset,
          Math.round(Dimensions.get('window').height * 0.75),
        );
        webViewRef.current?.injectJavaScript(`(()=>{
          window.scrollBy({top: ${offset}, behavior: 'smooth'})
        })()`);
      }
    });
  }, [webViewRef, volumeButtonsOffset, isPageReaderMode]);

  useEffect(() => {
    if (useVolumeButtons) {
      connectVolumeButton();
    } else {
      emmiter.removeAllListeners('VolumeUp');
      emmiter.removeAllListeners('VolumeDown');
      // this is just for sure, without it app still works properly
    }

    return () => {
      emmiter.removeAllListeners('VolumeUp');
      emmiter.removeAllListeners('VolumeDown');
      Speech.stop();
    };
  }, [useVolumeButtons, chapter, connectVolumeButton]);

  // Cleanup: abort all translations when the hook unmounts (leaving reader)
  useEffect(() => {
    return () => {
      currentTranslateAbort.current?.abort();
      backgroundTranslateAbort.current?.abort();
      translatedChapterCache.current.clear();
    };
  }, []);

  const loadChapterText = useCallback(
    async (id: number, path: string) => {
      let text = '';
      if (novel.pluginId === LOCAL_PLUGIN_ID) {
        // Local novels: always go through LocalPlugin.parseChapter()
        // which reads the file and rewrites file:// URIs to http://localhost
        const chapterDir = `${NOVEL_STORAGE}/local/${chapter.novelId}/${id}`;
        await fetchChapter(novel.pluginId, chapterDir)
          .then(res => {
            text = res;
          })
          .catch(e => setError(e.message));
      } else {
        // Online novels: check downloaded file first, then fetch from source
        const filePath = `${NOVEL_STORAGE}/${novel.pluginId}/${chapter.novelId}/${id}/index.html`;
        if (NativeFile.exists(filePath)) {
          text = NativeFile.readFile(filePath);
        } else {
          await fetchChapter(novel.pluginId, path)
            .then(res => {
              text = res;
            })
            .catch(e => setError(e.message));
        }
      }
      return text;
    },
    [chapter.novelId, novel.pluginId],
  );

  // --- Background pre-translate helper ---
  const startBackgroundTranslate = useCallback(
    (targetChapter: ChapterInfo, rawText: string) => {
      // Cancel any existing background translation
      backgroundTranslateAbort.current?.abort();

      const settings =
        getMMKVObject<TranslateSettings>(TRANSLATE_SETTINGS) ||
        initialTranslateSettings;

      if (!settings.autoTranslateNextChapter) return;

      const abortCtrl = new AbortController();
      backgroundTranslateAbort.current = abortCtrl;
      backgroundTranslatingChapterId.current = targetChapter.id;

      const sanitizedText = sanitizeChapterText(
        novel.pluginId,
        novel.name,
        targetChapter.name,
        rawText,
      );

      TranslateManager.translateChapterHTML(
        sanitizedText,
        settings as any,
        undefined, // no progress callback for background
        abortCtrl.signal,
      )
        .then(translatedHtml => {
          if (abortCtrl.signal.aborted) return;

          // Store in cache (limit to 1 entry)
          translatedChapterCache.current.clear();
          translatedChapterCache.current.set(targetChapter.id, translatedHtml);
          backgroundTranslatingChapterId.current = null;

          // If the user is currently viewing this chapter, apply translation
          if (onBackgroundCompleteRef.current) {
            onBackgroundCompleteRef.current(targetChapter.id, translatedHtml);
          }
        })
        .catch(e => {
          if (e?.name === 'AbortError') return; // silently ignore cancellation
          backgroundTranslatingChapterId.current = null;
          // On error, do NOT continue translating
        });
    },
    [novel.pluginId, novel.name],
  );

  const getChapter = useCallback(
    async (navChapter?: ChapterInfo) => {
      try {
        const chap = navChapter ?? chapter;
        const cachedText = await chapterTextCache.get(chap.id);
        const text = (cachedText && cachedText.length > 0) ? cachedText : loadChapterText(chap.id, chap.path);
        const [nextChapResult, prevChapResult, awaitedText] = await Promise.all(
          [
            getNextChapter(chap.novelId, chap.position!, chap.page ?? ''),
            getPrevChapter(chap.novelId, chap.position!, chap.page ?? ''),
            text,
          ],
        );

        let nextChap = nextChapResult;
        let prevChap = prevChapResult;

        // Pre-fetch adjacent page chapters if at a page boundary
        const currentPage = Number(chap.page);
        if (
          !nextChap &&
          novel.totalPages &&
          novel.totalPages > 0 &&
          currentPage < novel.totalPages
        ) {
          const nextPage = String(currentPage + 1);
          try {
            const count = await getChapterCount(chap.novelId, nextPage);
            if (count === 0) {
              const sourcePage = await fetchPage(
                novel.pluginId,
                novel.path,
                nextPage,
              );
              await insertChapters(
                chap.novelId,
                sourcePage.chapters.map(ch => ({ ...ch, page: nextPage })),
              );
            }
            nextChap = await getNextChapter(
              chap.novelId,
              chap.position!,
              chap.page ?? '',
            );
          } catch {}
        }
        if (!prevChap && currentPage > 1) {
          const prevPage = String(currentPage - 1);
          try {
            const count = await getChapterCount(chap.novelId, prevPage);
            if (count === 0) {
              const sourcePage = await fetchPage(
                novel.pluginId,
                novel.path,
                prevPage,
              );
              await insertChapters(
                chap.novelId,
                sourcePage.chapters.map(ch => ({ ...ch, page: prevPage })),
              );
            }
            prevChap = await getPrevChapter(
              chap.novelId,
              chap.position!,
              chap.page ?? '',
            );
          } catch {}
        }

        if (nextChap && !chapterTextCache.get(nextChap.id)) {
          chapterTextCache.set(
            nextChap.id,
            loadChapterText(nextChap.id, nextChap.path),
          );
        }
        if (!cachedText) {
          chapterTextCache.set(chap.id, text);
        }

        // Cancel foreground translation from previous chapter
        currentTranslateAbort.current?.abort();
        currentTranslateAbort.current = null;

        chapterIdRef.current = chap.id;

        // using cheerio
        const loadedCheerio = load(awaitedText);
        const isOffline = loadedCheerio('meta[id="offline-translated-marker"]').length > 0;

        if (isOffline) {
          showToast(getString('readerScreen.usingOfflineTranslation'));
          setIsOfflineTranslated(true);
          setIsTranslated(true);
          setIsTranslating(false);
          setTranslateProgress(100);
          originalChapterText.current = '';
          onBackgroundCompleteRef.current = null;

          setChapter(chap);
          setChapterText(
            sanitizeChapterText(
              novel.pluginId,
              novel.name,
              chap.name,
              awaitedText,
            ),
          );
          setAdjacentChapter([nextChap!, prevChap!]);

          translatedChapterCache.current.delete(chap.id);
        } else {
          setIsOfflineTranslated(false);
          // Check if we have a cached translation for this chapter
          const cachedTranslation = translatedChapterCache.current.get(chap.id);
          if (cachedTranslation) {
            // We have a pre-translated version ready
            originalChapterText.current = sanitizeChapterText(
              novel.pluginId,
              novel.name,
              chap.name,
              awaitedText,
            );
            setIsTranslated(true);
            setIsTranslating(false);
            setTranslateProgress(100);
            setChapter(chap);
            setChapterText(cachedTranslation);
            setAdjacentChapter([nextChap!, prevChap!]);
            // Clear the cache entry since we consumed it
            translatedChapterCache.current.delete(chap.id);

            // If there's a next chapter and autoTranslate is on, pre-translate it
            if (nextChap) {
              const nextRawText =
                chapterTextCache.get(nextChap.id) ??
                loadChapterText(nextChap.id, nextChap.path);
              Promise.resolve(nextRawText).then(resolvedText => {
                if (chapterIdRef.current === chap.id) {
                  startBackgroundTranslate(nextChap!, resolvedText);
                }
              });
            }
          } else if (backgroundTranslatingChapterId.current === chap.id) {
            // The background is currently translating this chapter
            originalChapterText.current = sanitizeChapterText(
              novel.pluginId,
              novel.name,
              chap.name,
              awaitedText,
            );
            setIsTranslating(true);
            setTranslateProgress(0);
            setIsTranslated(false);
            setChapter(chap);
            setChapterText(
              sanitizeChapterText(
                novel.pluginId,
                novel.name,
                chap.name,
                awaitedText,
              ),
            );
            setAdjacentChapter([nextChap!, prevChap!]);

            // Register callback so when background finishes, we apply it
            onBackgroundCompleteRef.current = (
              completedChapterId: number,
              html: string,
            ) => {
              if (chapterIdRef.current === completedChapterId) {
                setChapterText(html);
                setIsTranslated(true);
                setIsTranslating(false);
                setTranslateProgress(100);

                // Pre-translate the next chapter after background completes
                if (nextChap) {
                  const nextRawText =
                    chapterTextCache.get(nextChap.id) ??
                    loadChapterText(nextChap.id, nextChap.path);
                  Promise.resolve(nextRawText).then(resolvedText => {
                    if (chapterIdRef.current === completedChapterId) {
                      startBackgroundTranslate(nextChap!, resolvedText);
                    }
                  });
                }
              }
              onBackgroundCompleteRef.current = null;
            };
          } else {
            // Normal case: no cached translation, not being background-translated
            setIsTranslated(false);
            setIsTranslating(false);
            setTranslateProgress(0);
            originalChapterText.current = '';
            onBackgroundCompleteRef.current = null;

            setChapter(chap);
            setChapterText(
              sanitizeChapterText(
                novel.pluginId,
                novel.name,
                chap.name,
                awaitedText,
              ),
            );
            setAdjacentChapter([nextChap!, prevChap!]);
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [
      chapter,
      chapterTextCache,
      loadChapterText,
      setChapter,
      setChapterText,
      novel.pluginId,
      novel.name,
      novel.path,
      novel.totalPages,
      setLoading,
      startBackgroundTranslate,
    ],
  );

  const lastInteractionTime = useRef(Date.now());
  const autoScrollTimeout = useRef<NodeJS.Timeout>(null);

  const resetAutoScroll = useCallback(() => {
    lastInteractionTime.current = Date.now();
  }, []);

  useEffect(() => {
    let active = true;
    lastInteractionTime.current = Date.now();

    if (autoScroll && hidden) {
      const loop = () => {
        if (!active) return;
        const now = Date.now();
        const elapsed = now - lastInteractionTime.current;
        const delay = autoScrollInterval * 1000 - elapsed;

        if (delay <= 0) {
          if (AppState.currentState === 'active') {
            if (isPageReaderMode) {
              webViewRef.current?.injectJavaScript(`(()=>{
                pageReader.movePage(pageReader.page.val + 1);
              })()`);
            } else {
              webViewRef.current?.injectJavaScript(`(()=>{
                window.scrollBy({top:${defaultTo(
                  autoScrollOffset,
                  Dimensions.get('window').height,
                )},behavior:'smooth'})
              })()`);
            }
          }
          lastInteractionTime.current = Date.now();
          autoScrollTimeout.current = setTimeout(
            loop,
            autoScrollInterval * 1000,
          );
        } else {
          autoScrollTimeout.current = setTimeout(loop, delay);
        }
      };

      autoScrollTimeout.current = setTimeout(loop, autoScrollInterval * 1000);
    } else {
      if (autoScrollTimeout.current) clearTimeout(autoScrollTimeout.current);
    }

    return () => {
      active = false;
      if (autoScrollTimeout.current) clearTimeout(autoScrollTimeout.current);
    };
  }, [
    autoScroll,
    autoScrollInterval,
    autoScrollOffset,
    webViewRef,
    hidden,
    isPageReaderMode,
  ]);

  const updateTracker = useCallback(() => {
    const chapterNumber = parseChapterNumber(novel.name, chapter.name);
    if (tracker && trackedNovel && chapterNumber > trackedNovel.progress) {
      updateAllTrackedNovels({ progress: chapterNumber });
    }
  }, [chapter.name, novel.name, trackedNovel, tracker, updateAllTrackedNovels]);

  const saveProgress = useCallback(
    (percentage: number) => {
      if (!incognitoMode) {
        updateChapterProgress(chapter.id, percentage > 100 ? 100 : percentage);

        if (percentage >= 97) {
          // a relative number
          markChapterRead(chapter.id);
          updateTracker();
        }
      }
    },
    [
      chapter.id,
      incognitoMode,
      markChapterRead,
      updateChapterProgress,
      updateTracker,
    ],
  );

  const hideHeader = useCallback(() => {
    if (!hidden) {
      webViewRef.current?.injectJavaScript('reader.hidden.val = true');
      setImmersiveMode();
    } else {
      webViewRef.current?.injectJavaScript('reader.hidden.val = false');
      showStatusAndNavBar();
    }
    setHidden(!hidden);
    resetAutoScroll();
  }, [hidden, setImmersiveMode, showStatusAndNavBar, webViewRef]);

  const navigateChapter = useCallback(
    (position: 'NEXT' | 'PREV') => {
      let nextNavChapter;
      if (position === 'NEXT') {
        nextNavChapter = nextChapter;
      } else if (position === 'PREV') {
        nextNavChapter = prevChapter;
      } else {
        return;
      }
      if (nextNavChapter) {
        // Cancel any ongoing foreground translation for the current chapter
        if (currentTranslateAbort.current) {
          currentTranslateAbort.current.abort();
          currentTranslateAbort.current = null;
        }
        // Reset translation state so the new chapter starts clean
        setIsTranslating(false);
        setIsTranslated(false);
        setTranslateProgress(0);
        originalChapterText.current = '';

        resetAutoScroll();
        getChapter(nextNavChapter);
      } else {
        showToast(
          position === 'NEXT'
            ? getString('readerScreen.noNextChapter')
            : getString('readerScreen.noPreviousChapter'),
        );
      }
    },
    [getChapter, nextChapter, prevChapter],
  );

  useEffect(() => {
    if (!incognitoMode) {
      insertHistory(chapter.id);
      getDbChapter(chapter.id).then(result => result && setLastRead(result));
    }

    return () => {
      if (!incognitoMode) {
        getDbChapter(chapter.id).then(result => result && setLastRead(result));
      }
    };
  }, [incognitoMode, setLastRead, setLoading, chapter.id]);

  useEffect(() => {
    if (!chapter || !chapterText) {
      getChapter();
    }
  }, [chapter, chapterText, getChapter]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');
    chapterTextCache.delete(chapter.id);
    getChapter();
  }, [getChapter, chapter.id, chapterTextCache]);

  const revertTranslation = useCallback(() => {
    if (isTranslated && originalChapterText.current) {
      setChapterText(originalChapterText.current);
      setIsTranslated(false);
    }
  }, [isTranslated]);

  const translateChapter = useCallback(async () => {
    // If currently translating (foreground or background for this chapter), cancel it
    if (isTranslating) {
      currentTranslateAbort.current?.abort();
      currentTranslateAbort.current = null;
      // Also cancel background if it's translating this chapter
      if (backgroundTranslatingChapterId.current === chapterIdRef.current) {
        backgroundTranslateAbort.current?.abort();
        backgroundTranslateAbort.current = null;
        backgroundTranslatingChapterId.current = null;
      }
      onBackgroundCompleteRef.current = null;
      setIsTranslating(false);
      setTranslateProgress(0);
      // Revert to original text if we had saved it
      if (originalChapterText.current) {
        setChapterText(originalChapterText.current);
      }
      return;
    }

    // Toggle: if already translated, revert to original
    if (isTranslated) {
      revertTranslation();
      return;
    }

    // Start foreground translation
    const abortCtrl = new AbortController();
    currentTranslateAbort.current = abortCtrl;

    setIsTranslating(true);
    setTranslateProgress(0);
    const translatingChapterId = chapterIdRef.current;

    try {
      // Save original before translating
      originalChapterText.current = chapterText;

      const settings =
        getMMKVObject<TranslateSettings>(TRANSLATE_SETTINGS) ||
        initialTranslateSettings;
      const translatedHtml = await TranslateManager.translateChapterHTML(
        chapterText,
        settings as any,
        progress => setTranslateProgress(progress),
        abortCtrl.signal,
      );

      if (
        chapterIdRef.current === translatingChapterId &&
        !abortCtrl.signal.aborted
      ) {
        setChapterText(translatedHtml);
        setIsTranslated(true);

        // If autoTranslateNextChapter is on, pre-translate the next chapter
        if (settings.autoTranslateNextChapter && nextChapter) {
          const nextRawText =
            chapterTextCache.get(nextChapter.id) ??
            loadChapterText(nextChapter.id, nextChapter.path);
          Promise.resolve(nextRawText).then(resolvedText => {
            if (chapterIdRef.current === translatingChapterId) {
              startBackgroundTranslate(nextChapter, resolvedText);
            }
          });
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Translation was cancelled, do nothing
        return;
      }
      if (chapterIdRef.current === translatingChapterId) {
        showToast(e.message);
      }
    } finally {
      if (
        chapterIdRef.current === translatingChapterId &&
        !abortCtrl.signal.aborted
      ) {
        setIsTranslating(false);
        currentTranslateAbort.current = null;
      }
    }
  }, [
    chapterText,
    isTranslated,
    isTranslating,
    revertTranslation,
    nextChapter,
    chapterTextCache,
    loadChapterText,
    startBackgroundTranslate,
  ]);

  return useMemo(
    () => ({
      hidden,
      chapter,
      nextChapter,
      prevChapter,
      error,
      loading,
      chapterText,
      setHidden,
      saveProgress,
      hideHeader,
      navigateChapter,
      refetch,
      setChapter,
      setLoading,
      getChapter,
      isTranslating,
      translateProgress,
      translateChapter,
      isTranslated,
      isOfflineTranslated,
      revertTranslation,
      resetAutoScroll,
    }),
    [
      hidden,
      chapter,
      nextChapter,
      prevChapter,
      error,
      loading,
      chapterText,
      setHidden,
      saveProgress,
      hideHeader,
      navigateChapter,
      refetch,
      setChapter,
      setLoading,
      getChapter,
      isTranslating,
      translateProgress,
      translateChapter,
      isTranslated,
      isOfflineTranslated,
      revertTranslation,
      resetAutoScroll,
    ],
  );
}
