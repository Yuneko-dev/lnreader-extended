import { dbManager } from '@database/db';
import {
  updateNovelCategoryById,
  updateNovelInfo,
} from '@database/queries/NovelQueries';
import {
  chapterSchema,
  novelCategorySchema,
  novelSchema,
} from '@database/schema';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { BackgroundTaskMetadata } from '@services/ServiceManager';
import NativeEpub from '@specs/NativeEpub';
import NativeFile from '@specs/NativeFile';
import NativeZipArchive from '@specs/NativeZipArchive';
import { getString } from '@strings/translations';
import { EpubPerformanceTracker } from '@utils/epubPerformance';
import { NOVEL_STORAGE } from '@utils/Storages';
import dayjs from 'dayjs';
import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'react-native-quick-crypto';

const CHAPTER_INSERT_CHUNK_SIZE = 100;
const PROGRESS_UPDATE_INTERVAL_MS = 250;

const decodePath = (path: string) => {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
};

// Resource-referencing attributes inside chapter XHTML. EPUB 3 cover wrappers
// use `xlink:href` on <image> inside <svg>, and <video poster=...>; EPUB 2/3
// content uses plain href/src. The leading lookbehind requires whitespace or a
// quote before the attribute name so we don't match inside `data-href`,
// `data-src`, etc. Case-insensitive, may span lines (s flag).
const RESOURCE_ATTR_REGEX =
  /(?<=[\s"'])(href|src|xlink:href|poster)\s*=\s*(["'])(.*?)\2/gis;

// URLs we must NOT rewrite to a local file: any scheme (http:, https:, data:,
// mailto:, tel:, file:), protocol-relative (//host), or pure fragment (#id).
const EXTERNAL_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/**
 * Rewrite relative resource references in chapter XHTML to point at the flat
 * per-novel directory where images/CSS are copied. Leaves external links and
 * in-document fragments untouched.
 *
 * Exported for unit testing — this is the highest-frequency regression point.
 */
export const rewriteChapterResourceUrls = (
  html: string,
  novelDir: string,
): string =>
  html.replace(RESOURCE_ATTR_REGEX, (match, attr, quote, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || EXTERNAL_URL_REGEX.test(trimmed)) {
      return match;
    }
    // Drop any query/fragment, then keep only the basename (resources are
    // flattened into novelDir).
    const basename = trimmed.split(/[?#]/)[0].split(/[/\\]/).pop();
    if (!basename) {
      return match;
    }
    return `${attr}=${quote}file://${novelDir}/${basename}${quote}`;
  });

const insertLocalNovel = async (
  name: string,
  path: string,
  cover?: string,
  author?: string,
  artist?: string,
  summary?: string,
  genres?: string,
) => {
  const { insertId } = await dbManager.write(async tx => {
    return tx
      .insert(novelSchema)
      .values({
        name,
        path,
        pluginId: LOCAL_PLUGIN_ID,
        inLibrary: true,
        isLocal: true,
      })
      .run();
  });

  if (insertId !== undefined && insertId >= 0) {
    await updateNovelCategoryById(insertId, [2]);
    const novelDir = NOVEL_STORAGE + '/local/' + insertId;
    NativeFile.mkdir(novelDir);
    let newCoverPath = '';

    if (cover) {
      newCoverPath = `file://${novelDir}/${cover.split(/[/\\]/).pop()}`;
      const decodedPath = decodePath(cover);
      if (NativeFile.exists(decodedPath)) {
        NativeFile.moveFile(decodedPath, newCoverPath);
      }
    }
    await updateNovelInfo({
      id: insertId,
      pluginId: LOCAL_PLUGIN_ID,
      author: author,
      artist: artist,
      summary: summary,
      genres: genres,
      path: NOVEL_STORAGE + '/local/' + insertId,
      cover: newCoverPath,
      name: name,
      inLibrary: true,
      isLocal: true,
      totalPages: 0,
    });
    return insertId;
  }
  throw new Error(getString('advancedSettingsScreen.novelInsertFailed'));
};

/**
 * Phase 1: Batch insert all chapters in a single transaction.
 * Returns an array of { insertId, fakeId, sourcePath } for Phase 2 file I/O.
 */
const batchInsertChapters = async (
  novelId: number,
  chapters: { name: string; path: string }[],
  releaseTime: string,
): Promise<{ insertId: number; fakeId: number; sourcePath: string }[]> => {
  return await dbManager.write(async tx => {
    const rows = chapters.map((chapter, position) => ({
      novelId,
      name: chapter.name,
      path: NOVEL_STORAGE + '/local/' + novelId + '/' + position,
      releaseTime,
      position,
      isDownloaded: true,
    }));

    for (
      let offset = 0;
      offset < rows.length;
      offset += CHAPTER_INSERT_CHUNK_SIZE
    ) {
      await tx
        .insert(chapterSchema)
        .values(rows.slice(offset, offset + CHAPTER_INSERT_CHUNK_SIZE))
        .run();
    }

    const insertedChapters = await tx
      .select({
        insertId: chapterSchema.id,
        fakeId: chapterSchema.position,
      })
      .from(chapterSchema)
      .where(eq(chapterSchema.novelId, novelId))
      .orderBy(asc(chapterSchema.position))
      .all();

    return insertedChapters.flatMap(({ insertId, fakeId }) => {
      if (fakeId === null || fakeId < 0 || fakeId >= chapters.length) {
        return [];
      }
      return [{ insertId, fakeId, sourcePath: chapters[fakeId].path }];
    });
  });
};

const removeFailedImport = async (novelId: number) => {
  await dbManager.write(async tx => {
    await tx
      .delete(chapterSchema)
      .where(eq(chapterSchema.novelId, novelId))
      .run();
    await tx
      .delete(novelCategorySchema)
      .where(eq(novelCategorySchema.novelId, novelId))
      .run();
    await tx.delete(novelSchema).where(eq(novelSchema.id, novelId)).run();
  });

  const novelDir = `${NOVEL_STORAGE}/local/${novelId}`;
  if (NativeFile.exists(novelDir)) {
    NativeFile.unlink(novelDir);
  }
};

export const importEpub = async (
  {
    uri,
    filename,
  }: {
    uri: string;
    filename: string;
  },
  setMeta: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  const performance = new EpubPerformanceTracker('import');
  const workspacePath = `${
    NativeFile.getConstants().ExternalCachesDirectoryPath
  }/epub-import-${randomUUID()}`;
  const epubFilePath = `${workspacePath}/novel.epub`;
  const epubDirPath = `${workspacePath}/extracted`;
  let novelId: number | undefined;
  let chapterCount = 0;
  let imageCount = 0;
  let cssCount = 0;
  let chapterBytes = 0;
  let archiveBytes = 0;

  setMeta(meta => ({
    ...meta,
    isRunning: true,
    progress: 0,
  }));

  try {
    NativeFile.mkdir(workspacePath);

    performance.startPhase('copySource');
    try {
      NativeFile.copyFile(uri, epubFilePath);
      if (__DEV__) archiveBytes = NativeFile.getFileSize(epubFilePath);
    } catch {
      throw new Error(
        `Failed to read EPUB file "${filename}". The file may have been moved or deleted. Please try importing again.`,
      );
    }

    performance.startPhase('unzip');
    NativeFile.mkdir(epubDirPath);
    await NativeZipArchive.unzip(epubFilePath, epubDirPath);

    performance.startPhase('parseMetadata');
    const novel = await NativeEpub.parseNovelAndChapters(epubDirPath);
    if (!novel.name) {
      novel.name = filename.replace('.epub', '') || 'Untitled';
    }
    chapterCount = novel.chapters?.length ?? 0;
    imageCount = novel.imagePaths.length;
    cssCount = novel.cssPaths.length;

    performance.startPhase('insertNovel');
    novelId = await insertLocalNovel(
      novel.name,
      epubDirPath + novel.name, // temporary
      novel.cover || '',
      novel.author || '',
      novel.artist || '',
      novel.summary || '',
      novel.genres || '',
    );

    const now = dayjs().toISOString();
    if (novel.chapters) {
      for (const chapter of novel.chapters) {
        if (!chapter.name) {
          chapter.name = chapter.path.split(/[/\\]/).pop() || 'unknown';
        }
      }

      setMeta(meta => ({
        ...meta,
        progressText: getString('common.preparing'),
      }));

      performance.startPhase('insertChapters');
      const chapterResults = await batchInsertChapters(
        novelId,
        novel.chapters,
        now,
      );

      performance.startPhase('materializeChapters');
      const novelDir = `${NOVEL_STORAGE}/local/${novelId}`;
      let lastProgressUpdate = 0;
      for (let i = 0; i < chapterResults.length; i++) {
        const result = chapterResults[i];
        const nowMs = Date.now();
        if (
          i === 0 ||
          i === chapterResults.length - 1 ||
          nowMs - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS
        ) {
          lastProgressUpdate = nowMs;
          setMeta(meta => ({
            ...meta,
            progressText: novel.chapters[result.fakeId]?.name ?? `Chapter ${i}`,
            progress: i / chapterResults.length,
          }));
        }

        let chapterText = NativeFile.readFile(decodePath(result.sourcePath));
        if (!chapterText) continue;
        chapterBytes += chapterText.length;

        chapterText = rewriteChapterResourceUrls(chapterText, novelDir);

        NativeFile.mkdir(novelDir + '/' + result.insertId);
        NativeFile.writeFile(
          `${novelDir}/${result.insertId}/index.html`,
          chapterText,
        );
      }
    }

    const novelDir = NOVEL_STORAGE + '/local/' + novelId;
    setMeta(meta => ({
      ...meta,
      progressText: getString('advancedSettingsScreen.importStaticFiles'),
    }));

    performance.startPhase('moveStaticFiles');
    for (const filePath of novel.imagePaths) {
      const decodedPath = decodePath(filePath);

      if (NativeFile.exists(decodedPath)) {
        NativeFile.moveFile(
          decodedPath,
          novelDir + '/' + filePath.split(/[/\\]/).pop(),
        );
      }
    }

    for (const filePath of novel.cssPaths) {
      const decodedPath = decodePath(filePath);
      if (NativeFile.exists(decodedPath)) {
        NativeFile.moveFile(
          decodedPath,
          novelDir + '/' + filePath.split(/[/\\]/).pop(),
        );
      }
    }

    performance.endPhase();
  } catch (error) {
    if (novelId !== undefined) {
      try {
        await removeFailedImport(novelId);
      } catch (cleanupError) {
        if (__DEV__) {
          console.warn('Failed to roll back EPUB import', cleanupError);
        }
      }
    }
    setMeta(meta => ({
      ...meta,
      isRunning: false,
      progressText: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  } finally {
    performance.startPhase('cleanup');
    try {
      if (NativeFile.exists(workspacePath)) NativeFile.unlink(workspacePath);
    } catch (cleanupError) {
      if (__DEV__) {
        console.warn('Failed to clean EPUB import workspace', cleanupError);
      }
    }
    performance.finish({
      filename,
      archiveBytes,
      chapterBytes,
      chapterCount,
      imageCount,
      cssCount,
    });
  }

  setMeta(meta => ({ ...meta, progress: 1, isRunning: false }));
};
