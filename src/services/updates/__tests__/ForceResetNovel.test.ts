import { dbManager } from '@database/db';
import { fetchNovel } from '@services/plugin/fetch';

import { forceResetNovel } from '../ForceResetNovel';

const mockSelectWhere = jest.fn();
const mockDeleteRun = jest.fn();
const mockInsertRun = jest.fn();
const mockInsertValues = jest.fn(() => ({ run: mockInsertRun }));
const mockTransaction = {
  delete: jest.fn(() => ({
    where: jest.fn(() => ({ run: mockDeleteRun })),
  })),
  insert: jest.fn(() => ({ values: mockInsertValues })),
};

jest.mock('@database/db', () => ({
  dbManager: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({ where: mockSelectWhere })),
    })),
    write: jest.fn((callback: (tx: typeof mockTransaction) => unknown) =>
      callback(mockTransaction),
    ),
  },
}));

jest.mock('@services/plugin/fetch', () => ({
  fetchNovel: jest.fn(),
  fetchPage: jest.fn(),
}));

jest.mock('@hooks/persisted/useNovel', () => ({
  LAST_READ_PREFIX: 'LAST_READ_PREFIX',
}));

jest.mock('@utils/mmkv/mmkv', () => ({
  MMKVStorage: {
    getString: jest.fn(),
    remove: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@utils/Storages', () => ({
  NOVEL_STORAGE: '/novels',
}));

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

const mockDbManager = dbManager as jest.Mocked<typeof dbManager>;
const mockFetchNovel = fetchNovel as jest.MockedFunction<typeof fetchNovel>;

describe('forceResetNovel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectWhere.mockResolvedValue([]);
    mockDeleteRun.mockResolvedValue(undefined);
    mockInsertRun.mockResolvedValue(undefined);
  });

  it('restores scanlator metadata from fetched chapters', async () => {
    mockFetchNovel.mockResolvedValue({
      id: undefined,
      path: '/novel',
      name: 'Novel',
      totalPages: 1,
      chapters: [
        {
          name: 'Chapter 1',
          path: '/chapter-1',
          scanlator: ['Scan A', 'Scan B'],
        },
      ],
    });

    await forceResetNovel(
      1,
      'plugin',
      '/novel',
      {
        reloadMetadata: false,
        reloadChapters: true,
        reloadAllPages: false,
        deleteDownloads: false,
      },
      jest.fn(),
    );

    expect(mockDbManager.write).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        path: '/chapter-1',
        scanlator: 'Scan A, Scan B',
      }),
    ]);
  });
});
