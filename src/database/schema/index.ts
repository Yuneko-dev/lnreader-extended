export {
  type CategoryInsert,
  type CategoryRow,
  category as categorySchema,
} from './category';
export {
  type ChapterInsert,
  type ChapterRow,
  chapter as chapterSchema,
} from './chapter';
export { type NovelInsert, type NovelRow, novel as novelSchema } from './novel';
export {
  type NovelCategoryInsert,
  type NovelCategoryRow,
  novelCategory as novelCategorySchema,
} from './novelCategory';
export {
  type RepositoryInsert,
  type RepositoryRow,
  repository as repositorySchema,
} from './repository';

import { category } from './category';
import { chapter } from './chapter';
import { extendedChapterHistorySchema as extendedChapterHistory } from './extendedChapterHistory';
import { novel } from './novel';
import { novelCategory } from './novelCategory';
import { repository } from './repository';

export { extendedChapterHistorySchema } from './extendedChapterHistory';

/**
 * Unified schema object containing all database tables
 * Use this with Drizzle ORM for type-safe database operations
 */
export const schema = {
  category,
  novel,
  chapter,
  novelCategory,
  repository,
  extendedChapterHistory,
} as const;

export type Schema = typeof schema;
