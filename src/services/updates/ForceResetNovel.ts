import { dbManager } from '@database/db';
import {
  chapterSchema,
  extendedChapterHistorySchema,
  novelSchema,
} from '@database/schema';
import { LAST_READ_PREFIX } from '@hooks/persisted/useNovel';
import { downloadFile } from '@plugins/helpers/fetch';
import { getPlugin } from '@plugins/pluginManager';
import { ChapterItem } from '@plugins/types';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { NOVEL_STORAGE } from '@utils/Storages';
import { eq, inArray } from 'drizzle-orm';

import { fetchNovel, fetchPage } from '../plugin/fetch';

export interface ForceResetOptions {
  reloadMetadata: boolean;
  reloadChapters: boolean;
  reloadAllPages: boolean;
  deleteDownloads: boolean;
}

export const forceResetNovel = async (
  novelId: number,
  pluginId: string,
  novelPath: string,
  options: ForceResetOptions,
  log: (msg: string) => void,
) => {
  const { reloadMetadata, reloadChapters, reloadAllPages, deleteDownloads } =
    options;

  let sourceNovel;
  try {
    log(getString('novelScreen.forceResetModal.logFetchNovel'));
    sourceNovel = await fetchNovel(pluginId, novelPath);
  } catch (error: any) {
    throw new Error(
      getString('novelScreen.forceResetModal.logFetchError', {
        error: error.message,
      }),
    );
  }

  // 1. Reload Metadata
  if (reloadMetadata) {
    log(getString('novelScreen.forceResetModal.logReloadMetadata'));
    const { name, summary, author, artist, genres, status, totalPages } =
      sourceNovel;
    let { cover } = sourceNovel;
    const novelDir = `${NOVEL_STORAGE}/${pluginId}/${novelId}`;

    if (!NativeFile.exists(novelDir)) {
      NativeFile.mkdir(novelDir);
    }

    if (cover) {
      const novelCoverPath = `${novelDir}/cover.png`;
      const novelCoverUri = `file://${novelCoverPath}`;
      try {
        await downloadFile(
          cover,
          novelCoverPath,
          getPlugin(pluginId)?.imageRequestInit,
        );
        cover = `${novelCoverUri}?${Date.now()}`;
      } catch {
        cover = undefined;
      }
    }

    await dbManager.write(async tx => {
      await tx
        .update(novelSchema)
        .set({
          name,
          cover: cover || null,
          summary: summary || null,
          author: author || 'unknown',
          artist: artist || null,
          genres: genres || null,
          status: status || null,
          totalPages: totalPages || 0,
        })
        .where(eq(novelSchema.id, novelId))
        .run();
    });
    log(getString('novelScreen.forceResetModal.logReloadMetadataSuccess'));
  }

  // 2. Reload Chapters
  if (reloadChapters) {
    log(getString('novelScreen.forceResetModal.logReloadChapters'));

    // Backup existing chapters
    log(getString('novelScreen.forceResetModal.logBackupState'));
    const oldChapters = await dbManager
      .select()
      .from(chapterSchema)
      .where(eq(chapterSchema.novelId, novelId));

    const oldStateMap = new Map(oldChapters.map(c => [c.path, c]));
    log(
      getString('novelScreen.forceResetModal.logBackupSuccess', {
        count: oldChapters.length,
      }),
    );

    const oldChapterIds = oldChapters
      .map(c => c.id)
      .filter((id): id is number => id !== undefined && id !== null);

    log(getString('novelScreen.forceResetModal.logBackupNovelReadingTime'));
    const oldHistoryRecords =
      oldChapterIds.length > 0
        ? await dbManager
          .select()
          .from(extendedChapterHistorySchema)
          .where(
            inArray(extendedChapterHistorySchema.chapterId, oldChapterIds),
          )
        : [];



    let allFetchedChapters: ChapterItem[] = [...(sourceNovel.chapters || [])];

    // Fetch all pages if requested and applicable
    const totalPages = sourceNovel.totalPages || 0;
    if (totalPages > 1) {
      if (reloadAllPages) {
        log(
          getString('novelScreen.forceResetModal.logFetchAllPages', {
            totalPages,
          }),
        );
        for (let p = 2; p <= totalPages; p++) {
          try {
            log(
              getString('novelScreen.forceResetModal.logFetchPage', {
                page: p,
                totalPages,
              }),
            );
            const pageData = await fetchPage(pluginId, novelPath, String(p));
            // Force the page value so it's consistent if the plugin overrides it
            const pageChapters = (pageData.chapters || []).map(c => ({
              ...c,
              page: String(p),
            }));
            allFetchedChapters = allFetchedChapters.concat(pageChapters);
          } catch (error: any) {
            log(
              getString('novelScreen.forceResetModal.logFetchPageError', {
                page: p,
                error: error.message,
              }),
            );
          }
        }
      } else {
        log(
          getString('novelScreen.forceResetModal.logSkipPages', {
            remaining: totalPages - 1,
          }),
        );
      }
    }

    log(
      getString('novelScreen.forceResetModal.logFetchedTotal', {
        count: allFetchedChapters.length,
      }),
    );

    // Map old state to new chapters and insert
    const toInsert: any[] = [];
    const seenPaths = new Set<string>();

    for (let i = 0; i < allFetchedChapters.length; i++) {
      const chapter = allFetchedChapters[i];
      if (seenPaths.has(chapter.path)) {
        continue;
      }
      seenPaths.add(chapter.path);
      const {
        name,
        path,
        releaseTime,
        page: customPage,
        chapterNumber,
      } = chapter;
      const chapterPage = customPage || '1';

      const oldState = oldStateMap.get(path);

      toInsert.push({
        ...(oldState ? { id: oldState.id } : {}),
        novelId,
        path,
        name,
        releaseTime: releaseTime || null,
        chapterNumber: chapterNumber || null,
        page: chapterPage,
        position: i,
        // Restore user state if it exists
        unread: oldState ? oldState.unread : true,
        bookmark: oldState ? oldState.bookmark : false,
        readTime: oldState ? oldState.readTime : null,
        isDownloaded:
          oldState && !deleteDownloads ? oldState.isDownloaded : false,
        progress: oldState ? oldState.progress : null,
        // updatedTime is explicitly NOT SET to avoid emitting updates
        updatedTime: null,
      });
    }

    const validIds = new Set(
      toInsert.map(c => c.id).filter((id): id is number => id !== undefined),
    );

    // Clean up orphaned downloads
    let hasDeletedAny = false;
    for (const chapter of oldChapters) {
      if (chapter.isDownloaded && chapter.id !== undefined) {
        if (deleteDownloads || !validIds.has(chapter.id)) {
          if (!hasDeletedAny) {
            log(getString('novelScreen.forceResetModal.logDeleteDownloads'));
            hasDeletedAny = true;
          }
          const chapterDir = `${NOVEL_STORAGE}/${pluginId}/${novelId}/${chapter.id}`;
          if (NativeFile.exists(chapterDir)) {
            NativeFile.unlink(chapterDir);
          }
        }
      }
    }
    if (deleteDownloads && hasDeletedAny) {
      log(getString('novelScreen.forceResetModal.logDeleteDownloadsSuccess'));
    }

    await dbManager.write(async tx => {
      // Delete all existing chapters from DB
      log(getString('novelScreen.forceResetModal.logCleanDB'));
      await tx
        .delete(chapterSchema)
        .where(eq(chapterSchema.novelId, novelId))
        .run();

      if (toInsert.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
          const chunk = toInsert.slice(i, i + CHUNK_SIZE);
          await tx.insert(chapterSchema).values(chunk).run();
        }

        log(getString('novelScreen.forceResetModal.logRestoreNovelReadingTime'));
        const historyToInsert = oldHistoryRecords.filter(h =>
          validIds.has(h.chapterId),
        );
        if (historyToInsert.length > 0) {
          const HISTORY_CHUNK_SIZE = 500;
          for (let i = 0; i < historyToInsert.length; i += HISTORY_CHUNK_SIZE) {
            const chunk = historyToInsert.slice(i, i + HISTORY_CHUNK_SIZE);
            await tx.insert(extendedChapterHistorySchema).values(chunk).run();
          }
        }
      }
    });

    // Fix lastRead in MMKV if it exists
    const lastReadKey = `${LAST_READ_PREFIX}_${pluginId}_${novelPath}`;
    const lastReadStr = MMKVStorage.getString(lastReadKey);
    if (lastReadStr) {
      try {
        const lastReadObj = JSON.parse(lastReadStr);
        const newChapters = await dbManager
          .select()
          .from(chapterSchema)
          .where(eq(chapterSchema.novelId, novelId))
          .all();
        const newPathMap = new Map(newChapters.map(c => [c.path, c]));
        const newLastRead = newPathMap.get(lastReadObj.path);

        if (newLastRead) {
          MMKVStorage.set(lastReadKey, JSON.stringify(newLastRead));
        } else {
          MMKVStorage.remove(lastReadKey);
        }
      } catch {
        MMKVStorage.remove(lastReadKey);
      }
    }
  }
};
