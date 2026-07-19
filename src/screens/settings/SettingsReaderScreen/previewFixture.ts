import type { ChapterInfo, NovelInfo } from '@database/types';

import { dummyHTML } from './utils';

export const previewNovel: Partial<NovelInfo> = {
  artist: null,
  author: 'LNReader-kun',
  genres: 'Action,Hero',
  id: 16,
  inLibrary: true,
  isLocal: false,
  name: 'Preview Man (LN)',
  path: 'novel/preview-man-16091321',
  pluginId: 'lightnovelcave',
  status: 'Ongoing',
  summary:
    'To preview or not preview. A question that bothered humanity for a long time, until one day… Preview Man appeared.Show More',
  totalPages: 8,
};

export const previewChapter: Partial<ChapterInfo> = {
  bookmark: false,
  chapterNumber: 1,
  id: 3722,
  isDownloaded: true,
  name: 'Chapter 1 - The rise of Preview Man',
  novelId: 16,
  page: '2',
  path: 'novel/preview-man/chapter-1',
  position: 0,
  progress: 3,
  readTime: '2100-01-01 00:00:00',
  releaseTime: 'January 1, 2100',
  unread: true,
  updatedTime: null,
};

export const previewHTML = dummyHTML;
