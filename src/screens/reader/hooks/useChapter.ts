import {
  getChapter as getDbChapter,
  getChapterCount,
  getNextChapter,
  getPrevChapter,
  insertChapters,
} from '@database/queries/ChapterQueries';
import { insertHistory } from '@database/queries/HistoryQueries';
import { ChapterInfo, NovelInfo } from '@database/types';
import { useFullscreenMode } from '@hooks';
import {
  useChapterGeneralSettings,
  useTrackedNovel,
  useTracker,
} from '@hooks/persisted';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { useNovelActions } from '@screens/novel/NovelContext';
import { fetchChapter, fetchPage } from '@services/plugin/fetch';
import NativeFile from '@specs/NativeFile';
import NativeSPenRemote from '@specs/NativeSPenRemote';
import NativeVolumeButtonListener from '@specs/NativeVolumeButtonListener';
import { getString } from '@strings/translations';
import { parseChapterNumber } from '@utils/parseChapterNumber';
import { shouldBlockPrivacyAction } from '@utils/privacy';
import { showToast } from '@utils/showToast';
import { NOVEL_STORAGE } from '@utils/Storages';
import { load } from 'cheerio';
import * as Speech from 'expo-speech';
import { defaultTo } from 'lodash-es';
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Dimensions,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import WebView from 'react-native-webview';

import { sanitizeChapterText } from '../utils/sanitizeChapterText';
import {
  handleSPenRemoteEvent,
  SPEN_REMOTE_EVENTS,
  SPenRemoteEventName,
} from '../utils/sPenRemote';
import useChapterTranslation from './useChapterTranslation';

const { TikTokTTS } = NativeModules;

const emmiter = new NativeEventEmitter(NativeVolumeButtonListener);
const sPenEmitter = NativeSPenRemote
  ? new NativeEventEmitter(NativeSPenRemote)
  : null;

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
  } = useNovelActions();
  const [hidden, setHidden] = useState(true);
  const [chapter, setChapter] = useState(initialChapter);
  const [loading, setLoading] = useState(true);
  const chapterLoadTokenRef = useRef(0);

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
  const [error, setError] = useState<string>();
  const { tracker } = useTracker();
  const { trackedNovel, updateAllTrackedNovels } = useTrackedNovel(novel.id);
  const { setImmersiveMode, showStatusAndNavBar } = useFullscreenMode();

  useEffect(
    () => () => {
      chapterLoadTokenRef.current++;
    },
    [],
  );

  const connectVolumeButton = useCallback(() => {
    const volumeUpSubscription = emmiter.addListener('VolumeUp', () => {
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
    const volumeDownSubscription = emmiter.addListener('VolumeDown', () => {
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
    return () => {
      volumeUpSubscription.remove();
      volumeDownSubscription.remove();
    };
  }, [webViewRef, volumeButtonsOffset, isPageReaderMode]);

  useEffect(() => {
    const disconnect = useVolumeButtons
      ? connectVolumeButton()
      : () => undefined;

    return () => {
      disconnect();
      Speech.stop();
      TikTokTTS?.stop();
    };
  }, [useVolumeButtons, chapter, connectVolumeButton]);

  const loadChapterText = useCallback(
    async (id: number, path: string) => {
      let text = '';
      if (novel.pluginId === LOCAL_PLUGIN_ID) {
        // Local novels: always go through LocalPlugin.parseChapter()
        // which reads the file and rewrites file:// URIs to http://localhost
        const chapterDir = `${NOVEL_STORAGE}/local/${chapter.novelId}/${id}`;
        text = await fetchChapter(novel.pluginId, chapterDir);
      } else {
        // Online novels: check downloaded file first, then fetch from source
        const filePath = `${NOVEL_STORAGE}/${novel.pluginId}/${chapter.novelId}/${id}/index.html`;
        if (NativeFile.exists(filePath)) {
          text = NativeFile.readFile(filePath);
        } else {
          text = await fetchChapter(novel.pluginId, path);
        }
      }
      return text;
    },
    [chapter.novelId, novel.pluginId],
  );

  const {
    activateChapter,
    chapterText,
    isOfflineTranslated,
    isTranslated,
    isTranslating,
    prepareNavigation,
    retranslateChapter,
    revertTranslation,
    translateChapter,
    translateProgress,
  } = useChapterTranslation({ chapterTextCache, loadChapterText, novel });

  const getChapter = useCallback(
    async (navChapter?: ChapterInfo) => {
      const loadToken = ++chapterLoadTokenRef.current;
      try {
        const dbChapter = navChapter
          ? undefined
          : await getDbChapter(chapter.id);
        const chap = dbChapter ?? navChapter ?? chapter;
        prepareNavigation(chap.id);
        const cachedText = await chapterTextCache.read(chap.id);
        const text =
          cachedText && cachedText.length > 0
            ? cachedText
            : loadChapterText(chap.id, chap.path);
        const [nextChapResult, prevChapResult, awaitedText] = await Promise.all(
          [
            getNextChapter(chap.novelId, chap.position!, chap.page ?? ''),
            getPrevChapter(chap.novelId, chap.position!, chap.page ?? ''),
            text,
          ],
        );

        let nextChap = nextChapResult;
        let prevChap = prevChapResult;
        const totalPages = novel.totalPages ?? 0;

        // Pre-fetch adjacent page chapters if at a page boundary
        const currentPage = Number(chap.page);
        if (!nextChap && totalPages > 0 && currentPage < totalPages) {
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

        // using cheerio
        const loadedCheerio = load(awaitedText);
        const isOffline =
          loadedCheerio('meta[id="offline-translated-marker"]').length > 0;
        const noCache = loadedCheerio('meta[id="no-cache-marker"]').length > 0;
        const noPrefetch =
          loadedCheerio('meta[id="no-prefetch-marker"]').length > 0;

        if (!noPrefetch && nextChap && !chapterTextCache.read(nextChap.id)) {
          const prefetchPromise = loadChapterText(nextChap.id, nextChap.path);
          prefetchPromise.catch(() => {
            chapterTextCache.remove(nextChap!.id);
          });
          chapterTextCache.write(nextChap.id, prefetchPromise);
        }

        if (noCache) {
          chapterTextCache.remove(chap.id);
        } else if (!cachedText) {
          chapterTextCache.write(chap.id, text);
        }

        if (chapterLoadTokenRef.current !== loadToken) return;
        const sourceHtml = sanitizeChapterText(
          novel.pluginId,
          novel.name,
          chap.name,
          awaitedText,
        );
        if (isOffline) {
          showToast(getString('readerScreen.usingOfflineTranslation'));
        }
        setChapter(chap);
        setAdjacentChapter([nextChap!, prevChap!]);
        activateChapter({
          allowPrefetch: !noPrefetch,
          chapter: chap,
          isOffline,
          nextChapter: nextChap,
          sourceHtml,
        });
      } catch (e: any) {
        if (chapterLoadTokenRef.current === loadToken) setError(e.message);
      } finally {
        if (chapterLoadTokenRef.current === loadToken) setLoading(false);
      }
    },
    [
      chapter,
      chapterTextCache,
      loadChapterText,
      setChapter,
      novel.pluginId,
      novel.name,
      novel.path,
      novel.totalPages,
      setLoading,
      activateChapter,
      prepareNavigation,
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
    } else if (autoScrollTimeout.current) {
      clearTimeout(autoScrollTimeout.current);
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
      if (!shouldBlockPrivacyAction('readingProgress', novel.pluginId)) {
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
      markChapterRead,
      novel.pluginId,
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
  }, [
    hidden,
    setImmersiveMode,
    showStatusAndNavBar,
    webViewRef,
    resetAutoScroll,
  ]);

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
        prepareNavigation(nextNavChapter.id);
        resetAutoScroll();
        setLoading(true);
        getChapter(nextNavChapter);
      } else {
        showToast(
          position === 'NEXT'
            ? getString('readerScreen.noNextChapter')
            : getString('readerScreen.noPreviousChapter'),
        );
      }
    },
    [getChapter, nextChapter, prepareNavigation, prevChapter, resetAutoScroll],
  );

  const navigateChapterRef = useRef(navigateChapter);
  useEffect(() => {
    navigateChapterRef.current = navigateChapter;
  }, [navigateChapter]);

  const connectSPenRemote = useCallback(() => {
    if (!sPenEmitter) {
      return () => {};
    }

    const subscriptions = (
      Object.values(SPEN_REMOTE_EVENTS) as SPenRemoteEventName[]
    ).map(eventName =>
      sPenEmitter.addListener(eventName, () =>
        handleSPenRemoteEvent(
          {
            navigateChapter: pos => navigateChapterRef.current(pos),
            webViewRef,
          },
          eventName,
        ),
      ),
    );

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [webViewRef]);

  useEffect(() => {
    const disconnect = connectSPenRemote();

    return () => {
      disconnect();
    };
  }, [connectSPenRemote]);

  useEffect(() => {
    if (!shouldBlockPrivacyAction('readingHistory', novel.pluginId)) {
      insertHistory(chapter.id);
      getDbChapter(chapter.id).then(result => result && setLastRead(result));
    }

    return () => {
      if (!shouldBlockPrivacyAction('readingHistory', novel.pluginId)) {
        getDbChapter(chapter.id).then(result => result && setLastRead(result));
      }
    };
  }, [novel.pluginId, setLastRead, setLoading, chapter.id]);

  useEffect(() => {
    if (!chapter || !chapterText) {
      getChapter();
    }
  }, [chapter, chapterText, getChapter]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');
    chapterTextCache.remove(chapter.id);
    getChapter();
  }, [getChapter, chapter.id, chapterTextCache]);

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
      retranslateChapter,
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
      retranslateChapter,
    ],
  );
}
