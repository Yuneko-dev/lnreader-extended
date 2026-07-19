import { ChapterInfo, NovelInfo } from '@database/types';
import { getPlugin, LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import React, { createContext, useContext, useMemo, useRef } from 'react';
import WebView from 'react-native-webview';

import useChapter from './hooks/useChapter';

type ChapterContextType = ReturnType<typeof useChapter> & {
  novel: NovelInfo;
  plugin: ReturnType<typeof getPlugin>;
  canUseRemoteSource: boolean;
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
  const plugin = getPlugin(novel.pluginId);
  const canUseRemoteSource = Boolean(
    plugin && novel.pluginId !== LOCAL_PLUGIN_ID,
  );
  const chapterHookContent = useChapter(
    webViewRef,
    initialChapter,
    novel,
    canUseRemoteSource,
  );

  const contextValue = useMemo(
    () => ({
      novel,
      plugin,
      canUseRemoteSource,
      webViewRef,
      ...chapterHookContent,
    }),
    [novel, plugin, canUseRemoteSource, chapterHookContent],
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
