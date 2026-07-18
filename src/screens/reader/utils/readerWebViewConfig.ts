import { getString } from '@strings/translations';

export const READER_ASSETS_URI = __DEV__
  ? 'http://localhost:8081/assets'
  : 'file:///android_asset';

export const createReaderStrings = (
  chapterName?: string | null,
  nextChapterName?: string | null,
) => ({
  finished: `${getString('readerScreen.finished')}: ${
    chapterName?.trim() ?? ''
  }`,
  nextChapter: getString('readerScreen.nextChapter', {
    name: nextChapterName,
  }),
  noNextChapter: getString('readerScreen.noNextChapter'),
});
