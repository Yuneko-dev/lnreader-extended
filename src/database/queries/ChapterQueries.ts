import { ChapterFilterKey, ChapterOrderKey } from '@database/constants';
import { dbManager } from '@database/db';
import {
  chapterSchema,
  extendedChapterHistorySchema,
  novelSchema,
} from '@database/schema';
import { chapterFilterToSQL, chapterOrderToSQL } from '@database/utils/parser';
import { ChapterItem } from '@plugins/types';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import { NOVEL_STORAGE } from '@utils/Storages';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getColumns,
  gt,
  inArray,
  isNotNull,
  like,
  lt,
  lte,
  sql,
} from 'drizzle-orm';

import { ChapterInfo, DownloadedChapter, Update } from '../types';

// #region Mutations

/**
 * Insert or update chapters using Drizzle ORM
 */
export const insertChapters = async (
  novelId: number,
  chapters?: ChapterItem[],
  options?: {
    page?: string;
    touchUpdatedTime?: boolean; // ! todo
    preferNullReleaseTime?: boolean;
  },
): Promise<void> => {
  if (!chapters?.length) {
    return;
  }

  const nowSql = sql`datetime('now','localtime')`;

  const rows = chapters.map((c, index) => ({
    path: c.path,
    name: c.name || `Chapter ${index + 1}`,
    releaseTime: c.releaseTime ?? (options?.preferNullReleaseTime ? null : ''),
    novelId,
    chapterNumber: c.chapterNumber ?? index + 1,
    page: options?.page ?? c.page ?? '1',
    position: index,
  }));
  await dbManager.batch(rows, (tx, ph) =>
    tx
      .insert(chapterSchema)
      .values({
        path: ph('path'),
        name: ph('name'),
        releaseTime: ph('releaseTime'),
        novelId: ph('novelId'),
        chapterNumber: ph('chapterNumber'),
        page: ph('page'),
        position: ph('position'),
        ...(options?.touchUpdatedTime ? { updatedTime: nowSql } : {}),
      })
      .onConflictDoUpdate({
        target: [chapterSchema.novelId, chapterSchema.path],
        set: {
          page: sql`excluded.page`,
          position: sql`excluded.position`,
          name: sql`excluded.name`,
          releaseTime: sql`excluded.releaseTime`,
          chapterNumber: sql`excluded.chapterNumber`,
          ...(options?.touchUpdatedTime ? { updatedTime: nowSql } : {}),
        },
        where: sql`NOT (
          ${chapterSchema.page} IS excluded.page
          AND ${chapterSchema.position} IS excluded.position
          AND ${chapterSchema.name} IS excluded.name
          AND ${chapterSchema.releaseTime} IS excluded.releaseTime
          AND ${chapterSchema.chapterNumber} IS excluded.chapterNumber
        )`,
      })
      .prepare(),
  );
};

export const markChapterRead = async (chapterId: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: false, progress: 100 })
      .where(eq(chapterSchema.id, chapterId))
      .run();
  });
};

export const markChaptersRead = async (chapterIds: number[]): Promise<void> => {
  if (!chapterIds.length) {
    return;
  }
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: false, progress: 100 })
      .where(inArray(chapterSchema.id, chapterIds))
      .run();
  });
};

export const markChapterUnread = async (chapterId: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: true, progress: 0 })
      .where(eq(chapterSchema.id, chapterId))
      .run();
  });
};

export const markChaptersUnread = async (
  chapterIds: number[],
): Promise<void> => {
  if (!chapterIds.length) {
    return;
  }
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: true, progress: 0 })
      .where(inArray(chapterSchema.id, chapterIds))
      .run();
  });
};

export const markAllChaptersRead = async (novelId: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: false, progress: 100 })
      .where(eq(chapterSchema.novelId, novelId))
      .run();
  });
};

export const markAllChaptersUnread = async (novelId: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: true, progress: 0 })
      .where(eq(chapterSchema.novelId, novelId))
      .run();
  });
};

const deleteDownloadedFiles = (
  pluginId: string,
  novelId: number,
  chapterId: number,
) => {
  try {
    const chapterFolder = `${NOVEL_STORAGE}/${pluginId}/${novelId}/${chapterId}`;
    if (NativeFile.exists(chapterFolder)) {
      NativeFile.unlink(chapterFolder);
    }
  } catch {
    throw new Error(getString('novelScreen.deleteChapterError'));
  }
};

// delete downloaded chapter
export const deleteChapter = async (
  pluginId: string,
  novelId: number,
  chapterId: number,
): Promise<void> => {
  deleteDownloadedFiles(pluginId, novelId, chapterId);
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ isDownloaded: false })
      .where(eq(chapterSchema.id, chapterId))
      .run();
  });
};

export const deleteChapters = async (
  pluginId: string,
  novelId: number,
  chapters?: ChapterInfo[],
): Promise<void> => {
  if (!chapters?.length) {
    return;
  }
  const chapterIds = chapters.map(chapter => chapter.id);

  chapters.forEach(chapter =>
    deleteDownloadedFiles(pluginId, novelId, chapter.id),
  );

  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ isDownloaded: false })
      .where(inArray(chapterSchema.id, chapterIds))
      .run();
  });
};

// TODO: Remove the need for the chapters array, as it could lead to not deleting the downloaded files but just marking them as not downloaded
/*
  Deletes all downloaded chapters from the database
*/
export const deleteDownloads = async (
  chapters: DownloadedChapter[],
): Promise<void> => {
  if (!chapters?.length) {
    return;
  }
  chapters.forEach(chapter => {
    deleteDownloadedFiles(chapter.pluginId, chapter.novelId, chapter.id);
  });
  await dbManager.write(async tx => {
    await tx.update(chapterSchema).set({ isDownloaded: false }).run();
  });
};

export const deleteReadChaptersFromDb = async (): Promise<void> => {
  const chapters = await getReadDownloadedChapters();
  chapters?.forEach(chapter => {
    deleteDownloadedFiles(chapter.pluginId, chapter.novelId, chapter.id);
  });
  const chapterIds = chapters?.map(chapter => chapter.id);
  if (chapterIds?.length) {
    await dbManager.write(async tx => {
      await tx
        .update(chapterSchema)
        .set({ isDownloaded: false })
        .where(inArray(chapterSchema.id, chapterIds))
        .run();
    });
  }
  showToast(getString('novelScreen.readChaptersDeleted'));
};

export const updateChapterProgress = async (
  chapterId: number,
  progress: number,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ progress })
      .where(eq(chapterSchema.id, chapterId))
      .run();
  });
};

export const updateChapterProgressByIds = async (
  chapterIds: number[],
  progress: number,
): Promise<void> => {
  if (!chapterIds.length) {
    return;
  }
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ progress })
      .where(inArray(chapterSchema.id, chapterIds))
      .run();
  });
};

/**
 * Add reading duration (in seconds) to a chapter's total reading time.
 * This accumulates on top of the existing readDuration value.
 */
export const addReadDuration = async (
  chapterId: number,
  durationSeconds: number,
): Promise<void> => {
  if (durationSeconds <= 0) {
    return;
  }
  await dbManager.write(async tx => {
    await tx
      .insert(extendedChapterHistorySchema)
      .values({
        chapterId,
        readDuration: durationSeconds,
      })
      .onConflictDoUpdate({
        target: extendedChapterHistorySchema.chapterId,
        set: {
          readDuration: sql`COALESCE(${extendedChapterHistorySchema.readDuration}, 0) + ${durationSeconds}`,
        },
      })
      .run();
  });
};

export const bookmarkChapter = async (chapterId: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ bookmark: sql`NOT ${chapterSchema.bookmark}` })
      .where(eq(chapterSchema.id, chapterId))
      .run();
  });
};

export const markPreviouschaptersRead = async (
  chapterId: number,
  novelId: number,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: false, progress: 100 })
      .where(
        and(
          lte(chapterSchema.id, chapterId),
          eq(chapterSchema.novelId, novelId),
        ),
      )
      .run();
  });
};

export const markPreviousChaptersUnread = async (
  chapterId: number,
  novelId: number,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(chapterSchema)
      .set({ unread: true, progress: 0 })
      .where(
        and(
          lte(chapterSchema.id, chapterId),
          eq(chapterSchema.novelId, novelId),
        ),
      )
      .run();
  });
};

export const clearUpdates = async (): Promise<void> => {
  await dbManager.write(async tx => {
    await tx.update(chapterSchema).set({ updatedTime: null }).run();
  });
};

// #endregion
// #region Selectors

export const getCustomPages = (novelId: number) => {
  return dbManager.allSync(
    dbManager
      .select({ page: chapterSchema.page })
      .from(chapterSchema)
      .where(eq(chapterSchema.novelId, novelId))
      .groupBy(chapterSchema.page)
      .orderBy(asc(sql`MIN(${chapterSchema.position})`)),
  );
};

export const getNovelChapters = async (
  novelId: number,
  sort?: ChapterOrderKey,
  filter?: ChapterFilterKey[],
  page?: string,
  limit: number = -1,
): Promise<ChapterInfo[]> => {
  const query = dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        !page ? sql.raw('true') : eq(chapterSchema.page, page),
        chapterFilterToSQL(filter),
      ),
    )
    .orderBy(chapterOrderToSQL(sort));
  if (limit > 0) {
    query.limit(limit);
  }
  return query.all();
};

export const getNovelChaptersSync = (
  novelId: number,
  sort?: ChapterOrderKey,
  filter?: ChapterFilterKey[],
  page?: string,
  limit: number = 300,
): ChapterInfo[] => {
  const query = dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        !page ? sql.raw('true') : eq(chapterSchema.page, page),
        chapterFilterToSQL(filter),
      ),
    )
    .orderBy(chapterOrderToSQL(sort));
  if (limit > 0) {
    query.limit(limit); // Adding a limit to prevent potential performance issues with large datasets
  }
  return dbManager.allSync(query);
};
/**
 * @deprecated, use getNovelChapters with whereConditions instead
 */
export const getUnreadNovelChapters = async (
  novelId: number,
): Promise<ChapterInfo[]> =>
  dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(eq(chapterSchema.novelId, novelId), eq(chapterSchema.unread, true)),
    )
    .all();

/**
 * @deprecated, use getNovelChapters with whereConditions instead
 */
export const getAllUndownloadedChapters = async (
  novelId: number,
): Promise<ChapterInfo[]> =>
  dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.isDownloaded, false),
      ),
    )
    .all();

/**
 * @deprecated, use getNovelChapters with whereConditions instead
 */
export const getAllUndownloadedAndUnreadChapters = async (
  novelId: number,
): Promise<ChapterInfo[]> =>
  dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.isDownloaded, false),
        eq(chapterSchema.unread, true),
      ),
    )
    .all();

export const getChapter = async (chapterId: number) =>
  dbManager
    .select()
    .from(chapterSchema)
    .where(eq(chapterSchema.id, chapterId))
    .get();

export const getPageChapters = async (
  novelId: number,
  sort?: ChapterOrderKey,
  filter?: ChapterFilterKey[],
  page?: string,
  offset?: number,
  limit?: number,
): Promise<ChapterInfo[]> => {
  const query = dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.page, page || '1'),
        chapterFilterToSQL(filter),
      ),
    )
    .$dynamic();

  if (sort) {
    query.orderBy(chapterOrderToSQL(sort));
  }
  if (limit !== undefined) {
    query.limit(limit);
  }
  if (offset !== undefined) {
    query.offset(offset);
  }

  return query.all();
};

export const getChapterCount = async (
  novelId: number,
  page: string = '1',
  filter?: ChapterFilterKey[],
) =>
  await dbManager.$count(
    chapterSchema,
    and(
      eq(chapterSchema.novelId, novelId),
      eq(chapterSchema.page, page),
      chapterFilterToSQL(filter),
    ),
  );

export const getChapterCountSync = (
  novelId: number,
  page: string = '1',
  filter?: ChapterFilterKey[],
): number => {
  // Using count(*) as name because the current drizzle version generates wrong type
  const result = dbManager.getSync(
    dbManager
      .select({ 'count(*)': count() })
      .from(chapterSchema)
      .where(
        and(
          eq(chapterSchema.novelId, novelId),
          eq(chapterSchema.page, page),
          chapterFilterToSQL(filter),
        ),
      ),
  );

  return result?.['count(*)'] ?? 0;
};

export const getPageChaptersBatched = async (
  novelId: number,
  sort?: ChapterOrderKey,
  filter?: ChapterFilterKey[],
  page?: string,
  batch: number = 0,
) => {
  const limit = 300;
  const offset = 300 * batch;
  const query = dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.page, page || '1'),
        chapterFilterToSQL(filter),
      ),
    )
    .limit(limit)
    .offset(offset)
    .$dynamic();

  if (sort) {
    query.orderBy(chapterOrderToSQL(sort));
  }
  return query.all();
};

export const getNovelChaptersByNumber = async (
  novelId: number,
  chapterNumber: number,
) => {
  return dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.position, chapterNumber - 1),
      ),
    )
    .all();
};

export const getFirstUnreadChapter = (
  novelId: number,
  filter?: ChapterFilterKey[],
  page?: string,
) =>
  dbManager.getSync(
    dbManager
      .select()
      .from(chapterSchema)
      .where(
        and(
          eq(chapterSchema.novelId, novelId),
          eq(chapterSchema.page, page || '1'),
          eq(chapterSchema.unread, true),
          chapterFilterToSQL(filter),
        ),
      )
      .orderBy(asc(chapterSchema.position))
      .limit(1),
  );

export const getNovelChaptersByName = async (
  novelId: number,
  searchText: string,
) => {
  return dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        like(chapterSchema.name, `%${searchText}%`),
      ),
    )
    .all();
};

export const getPrevChapter = async (
  novelId: number,
  chapterPosition: number,
  page: string,
): Promise<ChapterInfo | undefined> => {
  // First try: same page, lower position
  const samePage = await dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.page, page),
        lt(chapterSchema.position, chapterPosition),
      ),
    )
    .orderBy(desc(chapterSchema.position))
    .limit(1)
    .get();
  if (samePage) {
    return samePage;
  }
  // Second try: previous page (ordered by MIN(id)), last chapter
  const pageOrder = dbManager
    .select({
      page: chapterSchema.page,
      minId: sql<number>`MIN(${chapterSchema.id})`.as('min_id'),
    })
    .from(chapterSchema)
    .where(eq(chapterSchema.novelId, novelId))
    .groupBy(chapterSchema.page)
    .as('page_order');

  const prevPageRow = await dbManager
    .select({ page: pageOrder.page })
    .from(pageOrder)
    .where(
      lt(
        pageOrder.minId,
        sql`(SELECT MIN(${chapterSchema.id}) FROM ${chapterSchema} WHERE ${chapterSchema.novelId} = ${novelId} AND ${chapterSchema.page} = ${page})`,
      ),
    )
    .orderBy(desc(pageOrder.minId))
    .limit(1)
    .get();

  if (!prevPageRow) {
    return undefined;
  }

  return dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.page, prevPageRow.page!),
      ),
    )
    .orderBy(desc(chapterSchema.position))
    .limit(1)
    .get();
};

export const getNextChapter = async (
  novelId: number,
  chapterPosition: number,
  page: string,
): Promise<ChapterInfo | undefined> => {
  // First try: same page, higher position
  const samePage = await dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.page, page),
        gt(chapterSchema.position, chapterPosition),
      ),
    )
    .orderBy(asc(chapterSchema.position))
    .limit(1)
    .get();
  if (samePage) {
    return samePage;
  }
  // Second try: next page (ordered by MIN(id)), first chapter
  const pageOrder = dbManager
    .select({
      page: chapterSchema.page,
      minId: sql<number>`MIN(${chapterSchema.id})`.as('min_id'),
    })
    .from(chapterSchema)
    .where(eq(chapterSchema.novelId, novelId))
    .groupBy(chapterSchema.page)
    .as('page_order');

  const nextPageRow = await dbManager
    .select({ page: pageOrder.page })
    .from(pageOrder)
    .where(
      gt(
        pageOrder.minId,
        sql`(SELECT MIN(${chapterSchema.id}) FROM ${chapterSchema} WHERE ${chapterSchema.novelId} = ${novelId} AND ${chapterSchema.page} = ${page})`,
      ),
    )
    .orderBy(asc(pageOrder.minId))
    .limit(1)
    .get();

  if (!nextPageRow) {
    return undefined;
  }

  return dbManager
    .select()
    .from(chapterSchema)
    .where(
      and(
        eq(chapterSchema.novelId, novelId),
        eq(chapterSchema.page, nextPageRow.page!),
      ),
    )
    .orderBy(asc(chapterSchema.position))
    .limit(1)
    .get();
};

const getReadDownloadedChapters = async () =>
  dbManager
    .select({
      id: chapterSchema.id,
      novelId: chapterSchema.novelId,
      pluginId: novelSchema.pluginId,
    })
    .from(chapterSchema)
    .innerJoin(novelSchema, eq(novelSchema.id, chapterSchema.novelId))
    .where(
      and(
        eq(chapterSchema.unread, false),
        eq(chapterSchema.isDownloaded, true),
      ),
    )
    .all();

export const getDownloadedChapters = async () =>
  dbManager
    .select({
      ...getColumns(chapterSchema),
      pluginId: novelSchema.pluginId,
      novelName: novelSchema.name,
      novelCover: novelSchema.cover,
      novelPath: novelSchema.path,
    })
    .from(chapterSchema)
    .innerJoin(novelSchema, eq(chapterSchema.novelId, novelSchema.id))
    .where(eq(chapterSchema.isDownloaded, true))
    .all();

export const getNovelDownloadedChapters = async (
  novelId: number,
  startPosition?: number,
  endPosition?: number,
): Promise<ChapterInfo[]> => {
  const whereConditions = [
    eq(chapterSchema.novelId, novelId),
    eq(chapterSchema.isDownloaded, true),
  ];

  if (startPosition !== undefined && endPosition !== undefined) {
    whereConditions.push(
      sql`${chapterSchema.position} >= ${startPosition - 1}`,
    );
    whereConditions.push(sql`${chapterSchema.position} <= ${endPosition - 1}`);
  }

  return dbManager
    .select()
    .from(chapterSchema)
    .where(and(...whereConditions))
    .orderBy(asc(chapterSchema.position))
    .all();
};

export const getUpdatedOverviewFromDb = async () =>
  dbManager
    .select({
      novelId: novelSchema.id,
      novelName: novelSchema.name,
      novelCover: novelSchema.cover,
      novelPath: novelSchema.path,
      updateDate:
        sql<string>`DATE(${chapterSchema.updatedTime}, 'localtime')`.as(
          'update_date',
        ),
      updatesPerDay: count(),
    })
    .from(chapterSchema)
    .innerJoin(novelSchema, eq(chapterSchema.novelId, novelSchema.id))
    .where(
      and(
        isNotNull(chapterSchema.updatedTime),
        sql`${chapterSchema.updatedTime} >= datetime('now', '-3 months')`,
      ),
    )
    .groupBy(novelSchema.id, sql`update_date`)
    .orderBy(desc(sql`update_date`), novelSchema.id)
    .all();

export const getDetailedUpdatesFromDb = async (
  novelId: number,
  updateDate?: string,
  onlyDownloadableChapters?: boolean,
): Promise<Update[]> => {
  return dbManager
    .select({
      ...getColumns(chapterSchema),
      pluginId: novelSchema.pluginId,
      novelId: novelSchema.id,
      novelName: novelSchema.name,
      novelPath: novelSchema.path,
      novelCover: novelSchema.cover,
    })
    .from(chapterSchema)
    .innerJoin(novelSchema, eq(chapterSchema.novelId, novelSchema.id))
    .where(
      and(
        eq(novelSchema.id, novelId),
        onlyDownloadableChapters
          ? eq(chapterSchema.isDownloaded, true)
          : and(
              isNotNull(chapterSchema.updatedTime),
              sql`${chapterSchema.updatedTime} >= datetime('now', '-3 months')`,
              updateDate
                ? eq(
                    sql`DATE(${chapterSchema.updatedTime}, 'localtime')`,
                    updateDate,
                  )
                : undefined,
            ),
      ),
    )
    .orderBy(desc(chapterSchema.updatedTime))
    .all();
};

export const isChapterDownloaded = (chapterId: number): boolean => {
  const result = dbManager.getSync(
    dbManager
      .select({ id: chapterSchema.id })
      .from(chapterSchema)
      .where(
        and(
          eq(chapterSchema.id, chapterId),
          eq(chapterSchema.isDownloaded, true),
        ),
      ),
  );

  return !!result;
};
