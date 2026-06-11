import {
  deleteCachedNovels as deleteCachedNovelsFromDb,
  getCachedNovels,
} from '@database/queries/NovelQueries';
import NativeFile from '@specs/NativeFile';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { NOVEL_STORAGE } from '@utils/Storages';

import {
  defaultNovelSettings,
  defaultPageIndex,
  keyContract,
  LAST_READ_PREFIX,
  NOVEL_PAGE_INDEX_PREFIX,
  NOVEL_SETTINGS_PREFIX,
  novelPersistence,
  type NovelPersistenceInput,
} from './useNovel/store-helper/contracts';
import type { BatchInfo, NovelSettings } from './useNovel/types';
import { TRACKED_NOVEL_PREFIX } from './useTrackedNovel';

export { LAST_READ_PREFIX, NOVEL_PAGE_INDEX_PREFIX, NOVEL_SETTINGS_PREFIX };
export { defaultNovelSettings, defaultPageIndex };
export type { BatchInfo, NovelSettings };

export const useNovel = () => {
  throw new Error(
    'useNovel has been retired. Access novel domain state/actions via useNovelContext().novelStore selectors.',
  );
};

const clearNovelPersistence = ({
  pluginId,
  novelPath,
}: NovelPersistenceInput) => {
  MMKVStorage.remove(keyContract.pageIndex({ pluginId, novelPath }));
  MMKVStorage.remove(keyContract.settings({ pluginId, novelPath }));
  MMKVStorage.remove(keyContract.lastRead({ pluginId, novelPath }));

  MMKVStorage.remove(novelPersistence.keys.pageIndex({ pluginId, novelPath }));
  MMKVStorage.remove(novelPersistence.keys.settings({ pluginId, novelPath }));
  MMKVStorage.remove(novelPersistence.keys.lastRead({ pluginId, novelPath }));
};

export const deleteCachedNovels = async () => {
  const cachedNovels = await getCachedNovels();

  for (const novel of cachedNovels) {
    MMKVStorage.remove(`${TRACKED_NOVEL_PREFIX}_${novel.id}`);
    clearNovelPersistence({
      pluginId: novel.pluginId,
      novelPath: novel.path,
    });

    const novelDir = `${NOVEL_STORAGE}/${novel.pluginId}/${novel.id}`;
    if (NativeFile.exists(novelDir)) {
      NativeFile.unlink(novelDir);
    }
  }

  await deleteCachedNovelsFromDb();
};
