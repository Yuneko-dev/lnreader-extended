import { getPlugin } from '@plugins/pluginManager';

import { fetchNovel, fetchPage } from '../fetch';

jest.mock('@plugins/pluginManager', () => ({
  getPlugin: jest.fn(),
}));

const mockGetPlugin = getPlugin as jest.MockedFunction<typeof getPlugin>;

describe('plugin chapter page normalization', () => {
  it('normalizes missing pages returned by parseNovel', async () => {
    mockGetPlugin.mockReturnValue({
      parseNovel: jest.fn().mockResolvedValue({
        path: '/novel',
        name: 'Novel',
        chapters: [{ name: 'Chapter 1', path: '/chapter-1' }],
      }),
    } as never);

    const novel = await fetchNovel('test-plugin', '/novel');

    expect(novel.chapters[0].page).toBe('1');
  });

  it('rejects an invalid parseNovel payload before returning it', async () => {
    mockGetPlugin.mockReturnValue({
      parseNovel: jest.fn().mockResolvedValue({
        path: '/novel',
        name: 'Novel',
        chapters: [
          { name: 'Valid', path: '/valid', page: '1' },
          { name: 'Invalid', path: '/invalid', page: 'Volume 1' },
        ],
      }),
    } as never);

    await expect(fetchNovel('test-plugin', '/novel')).rejects.toThrow(
      '[test-plugin] parseNovel returned invalid page "Volume 1"',
    );
  });

  it('validates and normalizes chapters returned by parsePage', async () => {
    mockGetPlugin.mockReturnValue({
      parsePage: jest.fn().mockResolvedValue({
        chapters: [{ name: 'Chapter 1', path: '/chapter-1' }],
      }),
    } as never);

    const page = await fetchPage('test-plugin', '/novel', '2');

    expect(page.chapters[0].page).toBe('1');
  });
});
