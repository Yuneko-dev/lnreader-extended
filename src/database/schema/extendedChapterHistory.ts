import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';
import { chapter } from './chapter';

export const extendedChapterHistorySchema = sqliteTable(
  'LNReader_eXtended_Chapter_History',
  {
    chapterId: integer('chapterId')
      .primaryKey()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    readDuration: integer('readDuration').default(0).notNull(),
  },
);
