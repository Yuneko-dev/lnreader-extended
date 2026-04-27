import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { ChapterInfo, NovelInfo } from '@database/types';
import WebView from 'react-native-webview';
import useChapter from './hooks/useChapter';

type ChapterContextType = ReturnType<typeof useChapter> & {
  novel: NovelInfo;
  webViewRef: React.RefObject<WebView<{}> | null>;
};

const defaultValue = {} as ChapterContextType;

const ChapterContext = createContext<ChapterContextType>(defaultValue);

export function ChapterContextProvider({
  children,
  novel,
  initialChapter,
}: {
  children: React.JSX.Element;
  novel: NovelInfo;
  initialChapter: ChapterInfo;
}) {
  const webViewRef = useRef<WebView>(null);
  // Stabilize novel reference — only update when novel.id changes
  const novelRef = useRef(novel);
  useEffect(() => {
    if (novelRef.current.id !== novel.id) {
      novelRef.current = novel;
    }
  }, [novel]);
  const stableNovel =
    novelRef.current.id === novel.id ? novelRef.current : novel;

  const chapterHookContent = useChapter(webViewRef, initialChapter, novel);

  const contextValue = useMemo(
    () => ({
      novel: stableNovel,
      webViewRef,
      ...chapterHookContent,
    }),
    [stableNovel, webViewRef, chapterHookContent],
  );

  return (
    <ChapterContext.Provider value={contextValue}>
      {children}
    </ChapterContext.Provider>
  );
}

export const useChapterContext = () => {
  return useContext(ChapterContext);
};
