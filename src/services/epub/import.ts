import { dbManager } from '@database/db';
import {
  updateNovelCategoryById,
  updateNovelInfo,
} from '@database/queries/NovelQueries';
import { chapterSchema, novelSchema } from '@database/schema';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { BackgroundTaskMetadata } from '@services/ServiceManager';
import NativeEpub from '@specs/NativeEpub';
import NativeFile from '@specs/NativeFile';
import NativeZipArchive from '@specs/NativeZipArchive';
import { getString } from '@strings/translations';
import { NOVEL_STORAGE } from '@utils/Storages';
import dayjs from 'dayjs';

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
    const results: { insertId: number; fakeId: number; sourcePath: string }[] =
      [];

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const { insertId } = await tx
        .insert(chapterSchema)
        .values({
          novelId,
          name: chapter.name,
          path: NOVEL_STORAGE + '/local/' + novelId + '/' + i,
          releaseTime,
          position: i,
          isDownloaded: true,
        })
        .run();

      if (insertId !== undefined && insertId >= 0) {
        results.push({
          insertId,
          fakeId: i,
          sourcePath: chapter.path,
        });
      }
    }

    return results;
  });
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
  setMeta(meta => ({
    ...meta,
    isRunning: true,
    progress: 0,
  }));

  const epubFilePath =
    NativeFile.getConstants().ExternalCachesDirectoryPath + '/novel.epub';
  try {
    NativeFile.copyFile(uri, epubFilePath);
  } catch {
    throw new Error(
      `Failed to read EPUB file "${filename}". The file may have been moved or deleted. Please try importing again.`,
    );
  }
  const epubDirPath =
    NativeFile.getConstants().ExternalCachesDirectoryPath + '/epub';
  if (NativeFile.exists(epubDirPath)) {
    NativeFile.unlink(epubDirPath);
  }
  NativeFile.mkdir(epubDirPath);
  await NativeZipArchive.unzip(epubFilePath, epubDirPath);
  const novel = await NativeEpub.parseNovelAndChapters(epubDirPath);
  if (!novel.name) {
    novel.name = filename.replace('.epub', '') || 'Untitled';
  }
  const novelId = await insertLocalNovel(
    novel.name,
    epubDirPath + novel.name, // temporary
    novel.cover || '',
    novel.author || '',
    novel.artist || '',
    novel.summary || '',
  );
  const now = dayjs().toISOString();
  if (novel.chapters) {
    // Normalize chapter names before insert
    for (const chapter of novel.chapters) {
      if (!chapter.name) {
        chapter.name = chapter.path.split(/[/\\]/).pop() || 'unknown';
      }
    }

    setMeta(meta => ({
      ...meta,
      progressText: getString('common.preparing'),
    }));

    // Phase 1: Single transaction — batch insert all chapters
    const chapterResults = await batchInsertChapters(
      novelId,
      novel.chapters,
      now,
    );

    // Phase 2: File I/O outside the transaction
    const novelDir = `${NOVEL_STORAGE}/local/${novelId}`;
    for (let i = 0; i < chapterResults.length; i++) {
      const result = chapterResults[i];

      setMeta(meta => ({
        ...meta,
        progressText: novel.chapters[result.fakeId]?.name ?? `Chapter ${i}`,
        progress: i / chapterResults.length,
      }));

      let chapterText = NativeFile.readFile(decodePath(result.sourcePath));
      if (!chapterText) continue;

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

  setMeta(meta => ({
    ...meta,
    progress: 1,
    isRunning: false,
  }));
};
