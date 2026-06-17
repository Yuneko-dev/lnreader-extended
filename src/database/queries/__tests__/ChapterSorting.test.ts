import './mockDb';

import { getNovelChapters, insertChapters } from '../ChapterQueries';
import { getTestDb, setupTestDatabase, teardownTestDatabase } from './setup';
import { clearAllTables, insertTestNovel } from './testData';

describe('Chapter Sorting Logic', () => {
  beforeEach(() => {
    const testDb = setupTestDatabase();
    clearAllTables(testDb);
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  const testCases = [
    {
      name: 'Case 1: No pages',
      chapters: Array.from({ length: 1000 }, (_, i) => ({
        path: `/${i + 1}`,
        name: `Chapter ${i + 1}: Test Chapter`,
      })),
    },
    {
      name: 'Case 2: Incremental pages',
      chapters: Array.from({ length: 1000 }, (_, i) => ({
        path: `/${i + 1}`,
        name: `Chapter ${i + 1}: Test Chapter`,
        page: `${Math.floor((i + 1) / 100) + 1}`,
      })),
    },
    {
      name: 'Case 3: Restarting chapter numbers on different pages',
      chapters: Array.from({ length: 1000 }, (_, i) => ({
        path: `/${i + 1}`,
        name: `Chapter ${(i % 100) + 1}: Test Chapter`,
        page: `${Math.floor(i / 100) + 1}`,
      })),
    },
    {
      name: 'Case 4: Volume string pages, incremental chapters',
      chapters: Array.from({ length: 1000 }, (_, i) => ({
        path: `/${i + 1}`,
        name: `Chapter ${i + 1}: Test Chapter`,
        page: `Volume ${Math.floor(i / 100) + 1}`,
      })),
    },
    {
      name: 'Case 5: Volume string pages, restarting chapters',
      chapters: Array.from({ length: 1000 }, (_, i) => ({
        path: `/${i + 1}`,
        name: `Chapter ${(i % 100) + 1}: Test Chapter`,
        page: `Volume ${Math.floor(i / 100) + 1}`,
      })),
    },
  ];

  testCases.forEach((testCase, index) => {
    it(`should maintain correct order for ${testCase.name} using default sort (positionAsc)`, async () => {
      const testDb = getTestDb();
      const novelId = await insertTestNovel(testDb, { inLibrary: true });

      // Insert chapters
      await insertChapters(novelId, testCase.chapters as any);

      // Fetch chapters with default sort
      const result = await getNovelChapters(novelId);

      // Check if the names and pages match the input order exactly
      result.forEach((chapter, i) => {
        expect(chapter.name).toBe(testCase.chapters[i].name);
        // @ts-expect-error
        expect(chapter.page).toBe(testCase.chapters[i].page || "1");
      });
    });
  });
});
