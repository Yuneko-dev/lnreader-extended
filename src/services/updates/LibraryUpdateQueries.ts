import { fetchNovel, fetchPage } from '../plugin/fetch';
import { ChapterItem, SourceNovel } from '@plugins/types';
import { getPlugin, LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { NOVEL_STORAGE } from '@utils/Storages';
import { downloadFile } from '@plugins/helpers/fetch';
import ServiceManager from '@services/ServiceManager';
import { dbManager } from '@database/db';
import { novelSchema, chapterSchema } from '@database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import NativeFile from '@specs/NativeFile';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { NOVEL_UPDATE_RANDOM_KEY } from '@hooks/persisted/useUpdates';

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
  await dbManager.write(async tx => {
    // Query existing chapters — scoped by page when page param is provided
    const existingChapters = await tx
      .select({
        id: chapterSchema.id,
        path: chapterSchema.path,
        name: chapterSchema.name,
        releaseTime: chapterSchema.releaseTime,
        page: chapterSchema.page,
        position: chapterSchema.position,
        unread: chapterSchema.unread,
        bookmark: chapterSchema.bookmark,
        isDownloaded: chapterSchema.isDownloaded,
      })
      .from(chapterSchema)
      .where(
        page
          ? and(
              eq(chapterSchema.novelId, novelId),
              eq(chapterSchema.page, page),
            )
          : eq(chapterSchema.novelId, novelId),
      )
      .all();

    const existingMap = new Map(existingChapters.map(c => [c.path, c]));

    // If no existing chapters in scope, this is the first population — don't set dateFetch
    const isFirstPopulation = existingChapters.length === 0;

    const novelInfo = await tx
      .select({ inLibrary: novelSchema.inLibrary })
      .from(novelSchema)
      .where(eq(novelSchema.id, novelId))
      .get();

    // If novel is not in library, don't set updatedTime
    const inLibrary = novelInfo?.inLibrary ?? false;
    const toInsert: Array<{
      path: string;
      name: string;
      releaseTime: string | null;
      novelId: number;
      updatedTime: string | null;
      chapterNumber: number | null;
      page: string;
      position: number;
    }> = [];
    const toUpdate = [];

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
          updatedTime: null,
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
            page: chapterPage,
            position: position,
          });
        }
      }
    }

    console.log(
      `[updateNovelChapters] novelId=${novelId} page=${page ?? 'ALL'}` +
        ` existing=${existingChapters.length} insert=${toInsert.length}` +
        ` update=${toUpdate.length} isFirstPop=${isFirstPopulation}` +
        ` inLibrary=${inLibrary} skip=${!!skipUpdateFlag}` +
        ` src=${chapters.length}`,
    );
    if (toInsert.length > 0 && existingChapters.length > 0) {
      const srcPath = chapters[0].path;
      const dbPath = existingChapters[0].path;
      console.log(
        `[updateNovelChapters] PATH MISMATCH?\n` +
          `  DB:  "${dbPath}"\n` +
          `  SRC: "${srcPath}"\n` +
          `  MATCH: ${existingMap.has(srcPath)}`,
      );
    }

    // ═══ DELETE LOGIC ═══
    // Only delete if:
    // - Not first population (we have existing data to compare against)
    // - Not a skip-update call (first-time page fetch)
    // - Source returned chapters (empty source = possible network error, don't delete)
    const toDelete: number[] = [];
    if (!isFirstPopulation && !skipUpdateFlag && chapters.length > 0) {
      const fetchedPaths = new Set(chapters.map(c => c.path));

      if (page) {
        // Page is provided (scoped query) — safe to compare directly
        for (const existing of existingChapters) {
          if (!fetchedPaths.has(existing.path)) {
            // Only delete if no user data
            if (
              existing.unread &&
              !existing.bookmark &&
              !existing.isDownloaded
            ) {
              toDelete.push(existing.id);
            }
          }
        }
      } else {
        // Page is NOT provided (Base plugin, queried ALL chapters)
        // Cross-page protection: only delete within page groups that are in the source
        const sourcePages = new Set(chapters.map(c => c.page || '1'));
        for (const existing of existingChapters) {
          const existingPage = existing.page || '1';
          if (!sourcePages.has(existingPage)) {
            continue; // Skip chapters from pages not represented in source
          }
          if (!fetchedPaths.has(existing.path)) {
            // Only delete if no user data
            if (
              existing.unread &&
              !existing.bookmark &&
              !existing.isDownloaded
            ) {
              toDelete.push(existing.id);
            }
          }
        }
      }
    }

    // Assign updatedTime with offset for correct ordering (like Mihon: nowMillis + itemCount--)
    // Only for truly new chapters, skip on first population, if not in library, or if skipUpdateFlag is set
    if (
      !isFirstPopulation &&
      !skipUpdateFlag &&
      inLibrary &&
      toInsert.length > 0
    ) {
      const nowMs = Date.now();
      let itemCount = toInsert.length;
      for (const item of toInsert) {
        item.updatedTime = new Date(nowMs + itemCount--).toISOString();
      }
    }

    if (toInsert.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        const newChapters = await tx
          .insert(chapterSchema)
          .values(chunk)
          .returning();

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
      // Force UI refresh
      if (inLibrary && !skipUpdateFlag) {
        MMKVStorage.set(
          NOVEL_UPDATE_RANDOM_KEY,
          Math.random().toString(36).substring(2, 15),
        );
      }
    }

    if (toUpdate.length > 0) {
      for (const chapterData of toUpdate) {
        await tx
          .update(chapterSchema)
          .set({
            name: chapterData.name,
            releaseTime: chapterData.releaseTime,
            page: chapterData.page,
            position: chapterData.position,
          })
          .where(
            and(
              eq(chapterSchema.id, chapterData.id),
              eq(chapterSchema.novelId, novelId),
            ),
          )
          .run();
      }
    }

    if (toDelete.length > 0) {
      // Cleanup downloaded files before deleting from DB
      for (const chapterId of toDelete) {
        const chapterDir = `${NOVEL_STORAGE}/${pluginId}/${novelId}/${chapterId}`;
        if (NativeFile.exists(chapterDir)) {
          NativeFile.unlink(chapterDir);
        }
      }
      // Delete from DB in chunks
      const CHUNK_SIZE = 500;
      for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
        const chunk = toDelete.slice(i, i + CHUNK_SIZE);
        await tx
          .delete(chapterSchema)
          .where(
            and(
              inArray(chapterSchema.id, chunk),
              eq(chapterSchema.novelId, novelId),
            ),
          )
          .run();
      }
    }
  });
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
