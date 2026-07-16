import { ChapterOrderKey } from '@database/constants';
import { NovelInfo } from '@database/types';
import { NovelSettings } from '@hooks/persisted/useNovel';
import { createNovelSlice } from '@hooks/persisted/useNovel/store/novelStore';
import { novelPersistence } from '@hooks/persisted/useNovel/store-helper/persistence';
import { createStore as createZustandStore } from 'zustand';

import { createBootstrapService } from '../store-helper/bootstrapService';
import { defaultChapterActionsDependencies } from './chapterActions';
import { createNovelStoreActions } from './novelStore.actions';
import { createNovelStoreChapterActions } from './novelStore.chapterActions';
import { createInitialChapterSlice } from './novelStore.chapterState';
import {
  NovelStoreApi,
  NovelStoreDependencies,
  NovelStoreState,
} from './novelStore.types';

interface Props {
  pluginId: string;
  path: string;
  novel?: NovelInfo;
  defaultChapterSort: ChapterOrderKey;
  switchNovelToLibrary: (novelPath: string, pluginId: string) => Promise<void>;
}

export function createStore({
  novel,
  defaultChapterSort,
  path,
  pluginId,
  switchNovelToLibrary,
}: Props): NovelStoreApi {
  const persistenceInput = {
    pluginId,
    novelPath: path,
  };

  const novelSettings: NovelSettings = {
    sort: defaultChapterSort,
    ...novelPersistence.readSettings(persistenceInput),
  };

  const bootstrapService = createBootstrapService();
  let storeRef: { getState: () => NovelStoreState } | null = null;
  const deps: NovelStoreDependencies = {
    bootstrapService,
    chapterActionsDependencies: defaultChapterActionsDependencies,
    transformChapters: c => {
      const excluded =
        storeRef?.getState().novelSettings.excludedScanlators || [];
      if (excluded.length === 0) {
        return c;
      }
      return c.filter(ch => !ch.scanlator || !excluded.includes(ch.scanlator));
    },
    persistPageIndex: value =>
      novelPersistence.writePageIndex(persistenceInput, value),
    persistNovelSettings: value => {
      novelPersistence.writeSettings(persistenceInput, value);
    },
    persistLastRead: chapter =>
      novelPersistence.writeLastRead(persistenceInput, chapter),
    switchNovelToLibrary,
  };

  const store = createZustandStore<NovelStoreState>()((set, get) => {
    const chapterSlice = createInitialChapterSlice();
    const actions = {
      ...createNovelStoreActions({
        set,
        get,
        deps,
        defaultChapterSort: novelSettings.sort,
      }),
      ...createNovelStoreChapterActions({
        set,
        get,
        bootstrapService: deps.bootstrapService,
        chapterActionsDependencies: deps.chapterActionsDependencies,
        transformChapters: deps.transformChapters,
        defaultChapterSort: novelSettings.sort,
      }),
    };
    return {
      ...createNovelSlice({
        pluginId,
        novelPath: path,
        novel,
        defaultChapterSort,
        initialPageIndex: novelPersistence.readPageIndex({
          pluginId,
          novelPath: path,
        }),
        initialNovelSettings: novelSettings,
        initialLastRead: novelPersistence.readLastRead(persistenceInput),
      }),
      ...chapterSlice,
      actions,
    };
  });
  storeRef = store;

  const success = store.getState().actions.bootstrapNovelSync();
  if (!success) {
    // If bootstrapNovelSync fails, it means the novel or chapters are not in the db
    store.getState().actions.bootstrapNovel();
  }

  return store;
}
