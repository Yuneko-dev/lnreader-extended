import { SELF_HOST_BACKUP } from '@hooks/persisted/useSelfHost';
import { OLD_TRACKED_NOVEL_PREFIX } from '@hooks/persisted/migrations/trackerMigration';
import {
  LAST_UPDATE_TIME,
  NOVEL_UPDATE_RANDOM_KEY,
} from '@hooks/persisted/useUpdates';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { version } from '../../../package.json';
import {
  _restoreNovelAndChapters,
  getAllNovels,
} from '@database/queries/NovelQueries';
import { getNovelChapters } from '@database/queries/ChapterQueries';
import {
  _restoreCategory,
  assignOrphanedNovelsToDefaultCategory,
  getAllNovelCategories,
  getCategoriesFromDb,
} from '@database/queries/CategoryQueries';
import { BackupCategory, BackupNovel } from '@database/types';
import { BackupEntryName } from './types';
import { ROOT_STORAGE } from '@utils/Storages';
import ServiceManager from '@services/ServiceManager';
import NativeFile from '@specs/NativeFile';
import { showToast } from '@utils/showToast';
import { getString } from '@strings/translations';
import DebugLogService from '@services/DebugLogService';
import { db } from '@database/db';
import { refreshAllNovelsStatsQuery } from '@database/queryStrings/triggers';

const BTAG = '[Backup]';

const APP_STORAGE_URI = 'file://' + ROOT_STORAGE;

export const CACHE_DIR_PATH =
  NativeFile.getConstants().ExternalCachesDirectoryPath + '/BackupData';

const backupMMKVData = () => {
  const excludeKeys = [
    ServiceManager.manager.STORE_KEY,
    OLD_TRACKED_NOVEL_PREFIX,
    SELF_HOST_BACKUP,
    LAST_UPDATE_TIME,
    NOVEL_UPDATE_RANDOM_KEY,
  ];
  const keys = MMKVStorage.getAllKeys().filter(
    key => !excludeKeys.includes(key),
  );
  const data = {} as any;
  for (const key of keys) {
    let value: number | string | boolean | undefined =
      MMKVStorage.getString(key);
    if (!value) {
      value = MMKVStorage.getBoolean(key);
    }
    if (key && value) {
      data[key] = value;
    }
  }
  return data;
};

const restoreMMKVData = (data: any) => {
  for (const key in data) {
    MMKVStorage.set(key, data[key]);
  }
};

export const prepareBackupData = async (cacheDirPath: string) => {
  const novelDirPath = cacheDirPath + '/' + BackupEntryName.NOVEL_AND_CHAPTERS;
  if (NativeFile.exists(novelDirPath)) {
    NativeFile.unlink(novelDirPath);
  }

  NativeFile.mkdir(novelDirPath); // this also creates cacheDirPath

  // version
  try {
    DebugLogService.addEntry('log', `${BTAG} Writing version info...`);
    NativeFile.writeFile(
      cacheDirPath + '/' + BackupEntryName.VERSION,
      JSON.stringify({ version: version }),
    );
  } catch (error: any) {
    showToast(
      getString('backupScreen.versionFileWriteFailed', {
        error: error?.message || String(error),
      }),
    );
    throw error;
  }

  // novels
  DebugLogService.addEntry('log', `${BTAG} Backing up novels...`);
  await getAllNovels().then(async novels => {
    DebugLogService.addEntry(
      'log',
      `${BTAG} Found ${novels.length} novels to backup`,
    );
    for (let i_ = 0; i_ < novels.length; i_++) {
      const novel = novels[i_];
      try {
        const chapters = await getNovelChapters(novel.id);
        DebugLogService.addEntry(
          'log',
          `${BTAG} [${i_ + 1}/${novels.length}] Processing novel: ${
            novel.name
          } (${chapters.length} chapters)`,
        );
        NativeFile.writeFile(
          novelDirPath + '/' + novel.id + '.json',
          JSON.stringify({
            chapters: chapters,
            ...novel,
            cover: novel.cover?.replace(APP_STORAGE_URI, ''),
          }),
        );
      } catch (error: any) {
        showToast(
          getString('backupScreen.novelBackupFailed', {
            novelName: novel.name,
            error: error?.message,
          }),
        );
      }
    }
  });

  // categories
  try {
    DebugLogService.addEntry('log', `${BTAG} Backing up categories...`);
    const categories = await getCategoriesFromDb();
    const novelCategories = await getAllNovelCategories();
    DebugLogService.addEntry(
      'log',
      `${BTAG} Found ${categories.length} categories`,
    );
    NativeFile.writeFile(
      cacheDirPath + '/' + BackupEntryName.CATEGORY,
      JSON.stringify(
        categories.map(category => {
          return {
            ...category,
            novelIds: novelCategories
              .filter(nc => nc.categoryId === category.id)
              .map(nc => nc.novelId),
          };
        }),
      ),
    );
  } catch (error: any) {
    showToast(
      getString('backupScreen.categoryFileWriteFailed', {
        error: error?.message || String(error),
      }),
    );
  }

  // settings
  try {
    DebugLogService.addEntry('log', `${BTAG} Backing up settings...`);
    NativeFile.writeFile(
      cacheDirPath + '/' + BackupEntryName.SETTING,
      JSON.stringify(backupMMKVData()),
    );
  } catch (error: any) {
    showToast(
      getString('backupScreen.settingsFileWriteFailed', {
        error: error?.message || String(error),
      }),
    );
  }
};

export const restoreData = async (cacheDirPath: string) => {
  const novelDirPath = cacheDirPath + '/' + BackupEntryName.NOVEL_AND_CHAPTERS;

  try {
    // 1. Disable triggers to speed up insertion
    // dropDbTriggers(db);

    // version
    // nothing to do

    // novels
    showToast(getString('backupScreen.restoringNovels'));
    let novelCount = 0;
    let failedCount = 0;

    if (!NativeFile.exists(novelDirPath)) {
      showToast(getString('backupScreen.novelDirectoryNotFound'));
    } else {
      try {
        const items = NativeFile.readDir(novelDirPath);
        DebugLogService.addEntry(
          'log',
          `${BTAG} Found ${items.length} novels to restore`,
        );
        for (let i_ = 0; i_ < items.length; i_++) {
          const item = items[i_];
          if (!item.isDirectory) {
            try {
              const fileContent = NativeFile.readFile(item.path);
              const backupNovel = JSON.parse(fileContent) as BackupNovel;
              DebugLogService.addEntry(
                'log',
                `${BTAG} [${i_ + 1}/${items.length}] Processing novel: ${
                  backupNovel.name
                } (${backupNovel.chapters.length} chapters)`,
              );

              if (!backupNovel.cover?.startsWith('http')) {
                backupNovel.cover = APP_STORAGE_URI + backupNovel.cover;
              }

              await _restoreNovelAndChapters(backupNovel);
              novelCount++;
            } catch (error: any) {
              failedCount++;
              const novelName =
                item.path.split('/').pop()?.replace('.json', '') || 'Unknown';
              showToast(
                getString('backupScreen.novelRestoreFailed', {
                  novelName: novelName,
                  error: error?.message || String(error),
                }),
              );
            }
          }
        }
      } catch (error: any) {
        showToast(
          getString('backupScreen.novelDirectoryReadFailed', {
            error: error?.message || String(error),
          }),
        );
      }
    }
    if (failedCount > 0) {
      showToast(
        getString('backupScreen.novelsRestoredWithErrors', {
          count: novelCount,
          failedCount: failedCount,
        }),
      );
    } else {
      showToast(
        getString('backupScreen.novelsRestored', { count: novelCount }),
      );
    }

    // categories
    showToast(getString('backupScreen.restoringCategories'));
    const categoryFilePath = cacheDirPath + '/' + BackupEntryName.CATEGORY;
    let categoryCount = 0;
    let failedCategoryCount = 0;

    if (!NativeFile.exists(categoryFilePath)) {
      showToast(getString('backupScreen.categoryFileNotFound'));
    } else {
      try {
        const fileContent = NativeFile.readFile(categoryFilePath);
        const categories: BackupCategory[] = JSON.parse(fileContent);
        DebugLogService.addEntry(
          'log',
          `${BTAG} Found ${categories.length} categories to restore`,
        );

        for (const category of categories) {
          try {
            DebugLogService.addEntry(
              'log',
              `${BTAG} Restoring category: ${category.name} (${category.id})`,
            );
            await _restoreCategory(category);
            categoryCount++;
          } catch (error: any) {
            failedCategoryCount++;
            showToast(
              getString('backupScreen.categoryRestoreFailed', {
                categoryName: category.name || category.id.toString(),
                error: error?.message || String(error),
              }),
            );
          }
        }
      } catch (error: any) {
        showToast(
          getString('backupScreen.categoryFileReadFailed', {
            error: error?.message || String(error),
          }),
        );
      }
    }
    if (failedCategoryCount > 0) {
      showToast(
        getString('backupScreen.categoriesRestoredWithErrors', {
          count: categoryCount,
          failedCount: failedCategoryCount,
        }),
      );
    } else {
      showToast(
        getString('backupScreen.categoriesRestored', {
          count: categoryCount,
        }),
      );
    }

    // settings
    showToast(getString('backupScreen.restoringSettings'));
    const settingsFilePath = cacheDirPath + '/' + BackupEntryName.SETTING;

    if (!NativeFile.exists(settingsFilePath)) {
      showToast(getString('backupScreen.settingsFileNotFound'));
    } else {
      try {
        const fileContent = NativeFile.readFile(settingsFilePath);
        const settingsData = JSON.parse(fileContent);
        restoreMMKVData(settingsData);
        showToast(getString('backupScreen.settingsRestored'));
      } catch (error: any) {
        showToast(
          getString('backupScreen.settingsRestoreFailed', {
            error: error?.message || String(error),
          }),
        );
      }
    }

    // 2. Refresh stats for all novels in bulk
    showToast(getString('backupScreen.finishingRestore'));
    DebugLogService.addEntry('log', `${BTAG} Refreshing all novel stats`);
    db.executeSync(refreshAllNovelsStatsQuery);

    // 3. Assign orphaned novels to default category
    DebugLogService.addEntry('log', `${BTAG} Assigning orphaned novels`);
    await assignOrphanedNovelsToDefaultCategory();
  } catch (e: any) {
    DebugLogService.addEntry(
      'error',
      `${BTAG} Error during restoreData: ${e.message}`,
    );
  } finally {
    // 4. Always re-enable triggers
    // createDbTriggers(db);
  }
};
