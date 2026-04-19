import { fetchNovel, fetchPage } from '../plugin/fetch';
import { ChapterItem, SourceNovel } from '@plugins/types';
import { getPlugin, LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { NOVEL_STORAGE } from '@utils/Storages';
import { downloadFile } from '@plugins/helpers/fetch';
import ServiceManager from '@services/ServiceManager';
import { dbManager } from '@database/db';
import { novelSchema, chapterSchema } from '@database/schema';
import { eq, and, sql } from 'drizzle-orm';
import NativeFile from '@specs/NativeFile';

/**
 * Update novel metadata in the database including cover image.
 */
const updateNovelMetadata = async (
  pluginId: string,
  novelId: number,
  novel: SourceNovel,
) => {
  const { name, summary, author, artist, genres, status, totalPages } = novel;
  let cover = novel.cover;
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
      // If download fails, we fallback to what was there or null
      cover = undefined;
    }
  }

  await dbManager.write(async tx => {
    tx.update(novelSchema)
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
};

/**
 * Update only the necessary information for a novel.
 */
const updateNovelNecessaryInfo = async (novelId: number, novel: SourceNovel) => {
  const { totalPages, status } = novel;
  const data: Record<string, any> = {};
  if (totalPages) {
    data.totalPages = totalPages;
  }
  if (status) {
    data.status = status;
  }
  if (Object.keys(data).length === 0) {
    return;
  }
  await dbManager.write(async tx => {
    tx.update(novelSchema)
      .set(data)
      .where(eq(novelSchema.id, novelId))
      .run();
  });
};

/**
 * Update or insert chapters for a novel.
 * Distinguishes between new chapters (triggers download) and existing chapters (updates metadata).
 */
const updateNovelChapters = async (
  novelName: string,
  novelId: number,
  chapters: ChapterItem[],
  downloadNewChapters?: boolean,
  page?: string,
) => {
  await dbManager.write(async tx => {
    // Check if chapter already exists
    const existingChapters = await tx
      .select({
        id: chapterSchema.id,
        path: chapterSchema.path,
        name: chapterSchema.name,
        releaseTime: chapterSchema.releaseTime,
        page: chapterSchema.page,
        position: chapterSchema.position,
      })
      .from(chapterSchema)
      .where(eq(chapterSchema.novelId, novelId));

    const existingMap = new Map(existingChapters.map(c => [c.path, c]));

    const toInsert = [];
    const toUpdate = [];

    const updatedTime = sql`datetime('now','localtime')`;

    for (let position = 0; position < chapters.length; position++) {
      const chapter = chapters[position];
      const {
        name,
        path,
        releaseTime,
        page: customPage,
        chapterNumber,
      } = chapter;
      const chapterPage = page || customPage || '1';

      const existing = existingMap.get(path);

      if (!existing) {
        // Insert new chapter
        toInsert.push({
          path,
          name,
          releaseTime: releaseTime || null,
          novelId,
          updatedTime,
          chapterNumber: chapterNumber || null,
          page: chapterPage,
          position: position,
        });
      } else {
        // Update existing chapter if metadata changed
        if (
          existing.name !== name ||
          existing.releaseTime !== releaseTime ||
          existing.page !== chapterPage ||
          existing.position !== position
        ) {
          toUpdate.push({
            id: existing.id,
            name,
            releaseTime: releaseTime || null,
            updatedTime,
            page: chapterPage,
            position: position,
          });
        }
      }
    }

    if (toInsert.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        const newChapters = await tx.insert(chapterSchema).values(chunk).returning();

        if (downloadNewChapters) {
          for (const newChapter of newChapters) {
            ServiceManager.manager.addTask({
              name: 'DOWNLOAD_CHAPTER',
              data: {
                chapterId: newChapter.id,
                novelName: novelName,
                chapterName: newChapter.name,
              },
            });
          }
        }
      }
    }

    if (toUpdate.length > 0) {
      for (const chapterData of toUpdate) {
        tx.update(chapterSchema)
          .set({
            name: chapterData.name,
            releaseTime: chapterData.releaseTime,
            updatedTime: chapterData.updatedTime,
            page: chapterData.page,
            position: chapterData.position,
          })
          .where(and(eq(chapterSchema.id, chapterData.id), eq(chapterSchema.novelId, novelId)))
          .run();
      }
    }
  });
};

export interface UpdateNovelOptions {
  downloadNewChapters?: boolean;
  refreshNovelMetadata?: boolean;
}

const getStoredTotalPages = async (novelId: number): Promise<number> => {
  const result = await dbManager
    .select({ totalPages: novelSchema.totalPages })
    .from(novelSchema)
    .where(eq(novelSchema.id, novelId))
    .get();

  return result?.totalPages ?? 0;
};

/**
 * Main function to update a novel's metadata and chapters.
 */
const updateNovel = async (
  pluginId: string,
  novelPath: string,
  novelId: number,
  options: UpdateNovelOptions,
) => {
  if (pluginId === LOCAL_PLUGIN_ID) {
    return;
  }
  const { downloadNewChapters, refreshNovelMetadata } = options;

  const oldTotalPages = await getStoredTotalPages(novelId);

  const novel = await fetchNovel(pluginId, novelPath);

  if (refreshNovelMetadata) {
    await updateNovelMetadata(pluginId, novelId, novel);
  } else {
    await updateNovelNecessaryInfo(novelId, novel);
  }

  await updateNovelChapters(
    novel.name,
    novelId,
    novel.chapters || [],
    downloadNewChapters,
  );

  // For paged novels: re-fetch the last known page and fetch any new pages
  if (novel.totalPages && novel.totalPages > 1) {
    const plugin = getPlugin(pluginId);
    if (plugin?.parsePage) {
      // Re-fetch the last known page to check for new chapters
      if (oldTotalPages > 1) {
        try {
          const sourcePage = await fetchPage(
            pluginId,
            novelPath,
            String(oldTotalPages),
          );
          await updateNovelChapters(
            novel.name,
            novelId,
            sourcePage.chapters || [],
            downloadNewChapters,
            String(oldTotalPages),
          );
        } catch {}
      }

      // Fetch any new pages that were added
      for (let page = oldTotalPages + 1; page <= novel.totalPages; page++) {
        try {
          const sourcePage = await fetchPage(pluginId, novelPath, String(page));
          await updateNovelChapters(
            novel.name,
            novelId,
            sourcePage.chapters || [],
            downloadNewChapters,
            String(page),
          );
        } catch {}
      }
    }
  }
};

/**
 * Update a specific page of chapters for a novel.
 */
const updateNovelPage = async (
  pluginId: string,
  novelName: string,
  novelPath: string,
  novelId: number,
  page: string,
  options: Pick<UpdateNovelOptions, 'downloadNewChapters'>,
) => {
  const { downloadNewChapters } = options;
  const sourcePage = await fetchPage(pluginId, novelPath, page);

  await updateNovelChapters(
    novelName,
    novelId,
    sourcePage.chapters || [],
    downloadNewChapters,
    page,
  );
};

export { updateNovel, updateNovelPage };
