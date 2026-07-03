import {
  createVolumePage,
  normalizeChapterPage,
  normalizePluginChapters,
  VOLUME_PAGE_MARKER,
} from '../chapterPage';

describe('chapter page helpers', () => {
  it('creates a marked volume page', () => {
    expect(createVolumePage('Volume 1')).toBe(`Volume 1${VOLUME_PAGE_MARKER}`);
  });

  it('removes existing markers before appending one marker', () => {
    expect(
      createVolumePage(`Vol${VOLUME_PAGE_MARKER}ume 1${VOLUME_PAGE_MARKER}`),
    ).toBe(`Volume 1${VOLUME_PAGE_MARKER}`);
  });

  it.each(['', '   ', VOLUME_PAGE_MARKER])(
    'rejects empty volume name %p',
    name => {
      expect(() => createVolumePage(name)).toThrow();
    },
  );

  it.each([
    [undefined, '1'],
    ['1', '1'],
    ['10', '10'],
    [`Volume 1${VOLUME_PAGE_MARKER}`, `Volume 1${VOLUME_PAGE_MARKER}`],
    [`10${VOLUME_PAGE_MARKER}`, `10${VOLUME_PAGE_MARKER}`],
  ])('normalizes valid page %p', (page, expected) => {
    expect(normalizeChapterPage(page)).toBe(expected);
  });

  it.each([
    '',
    '0',
    '-1',
    '1.5',
    'Volume 1',
    VOLUME_PAGE_MARKER,
    `Volume${VOLUME_PAGE_MARKER}${VOLUME_PAGE_MARKER}`,
    `Volume${VOLUME_PAGE_MARKER} 1`,
    null,
    1,
  ])('rejects invalid page %p', page => {
    expect(() => normalizeChapterPage(page)).toThrow();
  });

  it('rejects the entire plugin chapter payload with useful context', () => {
    expect(() =>
      normalizePluginChapters(
        'test-plugin',
        [
          { name: 'Valid', path: '/valid', page: '1' },
          { name: 'Invalid', path: '/invalid', page: 'Volume 1' },
        ],
        'parseNovel',
      ),
    ).toThrow(
      '[test-plugin] parseNovel returned invalid page "Volume 1" for chapter "/invalid"',
    );
  });
});
