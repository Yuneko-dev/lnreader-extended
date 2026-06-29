import { dbManager } from '@database/db';
import { chapterSchema, novelSchema } from '@database/schema';
import { NOVEL_UPDATE_RANDOM_KEY } from '@hooks/persisted/useUpdates';
import { downloadFile } from '@plugins/helpers/fetch';
import { getPlugin, LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { ChapterItem, SourceNovel } from '@plugins/types';
import ServiceManager from '@services/ServiceManager';
import NativeFile from '@specs/NativeFile';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { NOVEL_STORAGE } from '@utils/Storages';
import { and, eq, inArray } from 'drizzle-orm';

import { fetchNovel, fetchPage } from '../plugin/fetch';

/**
 * Update novel metadata in the database including cover image.
 */
const updateNovelMetadata = async (
  pluginId: string,
  novelId: number,
  novel: SourceNovel,
) => {
  const { name, summary, author, artist, genres, status, totalPages } = novel;
  let { cover } = novel;
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
};

/**
 * Update only the necessary information for a novel.
 */
const updateNovelNecessaryInfo = async (
  novelId: number,
  novel: SourceNovel,
) => {
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
    await tx
      .update(novelSchema)
      .set(data)
      .where(eq(novelSchema.id, novelId))
      .run();
  });
};
import { insertChapters } from '@database/queries/ChapterQueries';

/**
 * Update, insert, and delete chapters for a novel.
 *
 * Scoping rules:
 * - When `page` is provided (Page plugin loop): query only chapters for that page
 * - When `page` is undefined (Base plugin): query ALL chapters for the novel
 *
 * Delete safety:
 * - Only deletes chapters that are unread, not bookmarked, and not downloaded
 * - Cross-page protection: when page=undefined, only deletes within source page groups
 * - Skipped on first population and when skipUpdateFlag is set
 */
const updateNovelChapters = async (
  pluginId: string,
  novelName: string,
  novelId: number,
  chapters: ChapterItem[],
  downloadNewChapters?: boolean,
  page?: string,
  skipUpdateFlag?: boolean,
) => {
  if (!chapters.length) {
    return;
  }

  const incomingPaths = Array.from(new Set(chapters.map(c => c.path)));

  // 1. Fetch existing chapters in scope
  const existingChapters = await dbManager
    .select({
      id: chapterSchema.id,
      path: chapterSchema.path,
      page: chapterSchema.page,
      unread: chapterSchema.unread,
      bookmark: chapterSchema.bookmark,
      isDownloaded: chapterSchema.isDownloaded,
    })
    .from(chapterSchema)
    .where(
      page
        ? and(eq(chapterSchema.novelId, novelId), eq(chapterSchema.page, page))
        : eq(chapterSchema.novelId, novelId),
    )
    .all();

  const existingMap = new Map(existingChapters.map(c => [c.path, c]));
  const isFirstPopulation = existingChapters.length === 0;

  // 2. Identify completely new chapters
  const newPaths = incomingPaths.filter(path => !existingMap.has(path));

  // 3. Delete Safety Logic
  const toDelete: number[] = [];
  if (!isFirstPopulation && !skipUpdateFlag && chapters.length > 0) {
    const fetchedPaths = new Set(incomingPaths);

    if (page) {
      for (const existing of existingChapters) {
        if (
          !fetchedPaths.has(existing.path) &&
          existing.unread &&
          !existing.bookmark &&
          !existing.isDownloaded
        ) {
          toDelete.push(existing.id);
        }
      }
    } else {
      const sourcePages = new Set(chapters.map(c => c.page || '1'));
      for (const existing of existingChapters) {
        const existingPage = existing.page || '1';
        if (
          sourcePages.has(existingPage) &&
          !fetchedPaths.has(existing.path) &&
          existing.unread &&
          !existing.bookmark &&
          !existing.isDownloaded
        ) {
          toDelete.push(existing.id);
        }
      }
    }
  }

  // 4. Perform Modern Batch Upsert
  // We do NOT pass touchUpdatedTime: true because we want precise sub-second ordering for new chapters only.
  await insertChapters(novelId, chapters, { page });

  // 5. Execute Deletions
  if (toDelete.length > 0) {
    for (const chapterId of toDelete) {
      const chapterDir = `${NOVEL_STORAGE}/${pluginId}/${novelId}/${chapterId}`;
      if (NativeFile.exists(chapterDir)) {
        NativeFile.unlink(chapterDir);
      }
    }
    const CHUNK_SIZE = 500;
    for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
      const chunk = toDelete.slice(i, i + CHUNK_SIZE);
      await dbManager.write(async tx => {
        await tx
          .delete(chapterSchema)
          .where(
            and(
              inArray(chapterSchema.id, chunk),
              eq(chapterSchema.novelId, novelId),
            ),
          )
          .run();
      });
    }
  }

  // 6. Post-processing: Download Queue & Exact UpdatedTime Ordering
  if (newPaths.length > 0) {
    const insertedNewChapters = await dbManager
      .select({
        id: chapterSchema.id,
        path: chapterSchema.path,
        name: chapterSchema.name,
      })
      .from(chapterSchema)
      .where(
        and(
          eq(chapterSchema.novelId, novelId),
          inArray(chapterSchema.path, newPaths),
        ),
      )
      .all();

    const chapterNameByPath = new Map(
      chapters.map((chapter, index) => [
        chapter.path,
        chapter.name || `Chapter ${index + 1}`,
      ]),
    );

    // Queue downloads
    if (downloadNewChapters) {
      for (const chap of insertedNewChapters) {
        ServiceManager.manager.addTask({
          name: 'DOWNLOAD_CHAPTER',
          data: {
            chapterId: chap.id,
            novelName,
            chapterName: chapterNameByPath.get(chap.path) || chap.name,
          },
        });
      }
    }

    // Apply exact ordering to updatedTime
    const novelInfo = await dbManager
      .select({ inLibrary: novelSchema.inLibrary })
      .from(novelSchema)
      .where(eq(novelSchema.id, novelId))
      .get();
    const inLibrary = novelInfo?.inLibrary ?? false;

    if (!isFirstPopulation && !skipUpdateFlag && inLibrary) {
      // Sort to match original fetched array
      const pathToIndex = new Map(chapters.map((c, i) => [c.path, i]));
      insertedNewChapters.sort(
        (a, b) => pathToIndex.get(a.path)! - pathToIndex.get(b.path)!,
      );

      const nowMs = Date.now();
      const total = insertedNewChapters.length;

      // Single native batched UPDATE instead of N sequential awaited writes.
      // Frees the JS thread during library updates for novels with many new
      // chapters. updatedTime descends with sort order: chap[i] = nowMs+(total-i).
      const orderingRows = insertedNewChapters.map((chap, i) => ({
        id: chap.id,
        updatedTime: new Date(nowMs + (total - i)).toISOString(),
      }));

      await dbManager.batch(orderingRows, (tx, ph) =>
        tx
          .update(chapterSchema)
          .set({ updatedTime: ph('updatedTime') })
          .where(eq(chapterSchema.id, ph('id')))
          .prepare(),
      );

      // Force UI refresh
      MMKVStorage.set(
        NOVEL_UPDATE_RANDOM_KEY,
        Math.random().toString(36).substring(2, 15),
      );
    }
  }
};

export interface UpdateNovelOptions {
  downloadNewChapters?: boolean;
  refreshNovelMetadata?: boolean;
}

/**
 * Main function to update a novel's metadata and chapters.
 *
 * For Base plugins (totalPages=0): parseNovel() returns ALL chapters.
 *   updateNovelChapters is called once with page=undefined → queries all chapters.
 *
 * For Page plugins (totalPages>1): parseNovel() returns page 1 chapters.
 *   updateNovelChapters is called once per page with page=string → scoped queries.
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

  const novel = await fetchNovel(pluginId, novelPath);

  if (refreshNovelMetadata) {
    await updateNovelMetadata(pluginId, novelId, novel);
  } else {
    await updateNovelNecessaryInfo(novelId, novel);
  }

  // ═══ Page 1 / Base chapters: always update ═══
  // For Base plugins: this contains ALL chapters (page=undefined → query all)
  // For Page plugins: this contains only page 1 chapters (page=undefined → query all,
  //   but cross-page protection prevents deleting pages 2+)
  await updateNovelChapters(
    pluginId,
    novel.name,
    novelId,
    novel.chapters || [],
    downloadNewChapters,
  );

  // ═══ Paged novels: handle remaining pages ═══
  if (novel.totalPages && novel.totalPages > 1) {
    const plugin = getPlugin(pluginId);
    if (plugin?.parsePage) {
      // Get the set of pages already fetched (from actual DB chapter data)
      const fetchedPageRows = await dbManager
        .select({ page: chapterSchema.page })
        .from(chapterSchema)
        .where(eq(chapterSchema.novelId, novelId))
        .groupBy(chapterSchema.page)
        .all();
      const fetchedPages = new Set(
        fetchedPageRows.map(r => r.page).filter(Boolean),
      );

      // Find the last fetched page (highest numeric page in DB)
      const numericPages = Array.from(fetchedPages)
        .map(Number)
        .filter(n => !isNaN(n));
      const lastFetchedPage =
        numericPages.length > 0 ? Math.max(...numericPages) : 1;

      // Re-fetch the last known page to check for new chapters there
      if (lastFetchedPage > 1) {
        try {
          const sourcePage = await fetchPage(
            pluginId,
            novelPath,
            String(lastFetchedPage),
          );
          await updateNovelChapters(
            pluginId,
            novel.name,
            novelId,
            sourcePage.chapters || [],
            downloadNewChapters,
            String(lastFetchedPage),
            // NOT skipped: detect new chapters + remove deleted ones
          );
        } catch {}
      }

      // Fetch pages that have never been fetched before
      for (let p = 2; p <= novel.totalPages; p++) {
        const pageStr = String(p);
        if (fetchedPages.has(pageStr)) {
          continue; // Already fetched; last page was re-fetched above
        }
        try {
          const sourcePage = await fetchPage(pluginId, novelPath, pageStr);
          // First-time page fetch → skip dateFetch (not a real update)
          await updateNovelChapters(
            pluginId,
            novel.name,
            novelId,
            sourcePage.chapters || [],
            downloadNewChapters,
            pageStr,
            true, // skipUpdateFlag: first-time page fetch
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
    pluginId,
    novelName,
    novelId,
    sourcePage.chapters || [],
    downloadNewChapters,
    page,
  );
};

export { updateNovel, updateNovelPage };
