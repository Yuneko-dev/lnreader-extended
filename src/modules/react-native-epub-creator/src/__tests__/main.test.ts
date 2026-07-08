import { copyFile } from 'react-native-saf-x';

import EpubBuilder from '../main';

const mockConstructEpub = jest.fn();
const mockZipEpub = jest.fn();

jest.mock('@modules/epub-constructor', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(settings => ({
    constructEpub: (...args: unknown[]) => mockConstructEpub(...args),
    epubSettings: {
      ...settings,
      fileName: settings.fileName || settings.title,
    },
  })),
}));

jest.mock('@specs/NativeFile', () => ({
  detectImageMimeType: jest.fn(),
  exists: jest.fn(() => false),
  readDir: jest.fn(() => []),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('@specs/NativeZipArchive', () => ({
  zipEpub: (...args: unknown[]) => mockZipEpub(...args),
}));

jest.mock('react-native-file-access', () => ({
  Dirs: {
    CacheDir: '/cache',
  },
  FileSystem: {
    fetch: jest.fn(),
  },
}));

jest.mock('react-native-saf-x', () => ({
  copyFile: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(false)),
  hasPermission: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  openDocumentTree: jest.fn(),
  unlink: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
}));

const mockCopyFile = copyFile as jest.MockedFunction<typeof copyFile>;

describe('EpubBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConstructEpub.mockResolvedValue([]);
    mockZipEpub.mockResolvedValue(undefined);
  });

  it('preserves dots in file names when adding the epub extension', async () => {
    const epub = new EpubBuilder(
      {
        title: 'Volume 1',
        fileName: 'vol.1',
        chapters: [{ title: 'Chapter 1', htmlBody: '<p>Chapter</p>' }],
      },
      'content://exports',
    );

    await epub.prepare();
    const outputFile = await epub.save();

    expect(outputFile).toBe('content://exports/vol.1.epub');
    expect(mockCopyFile).toHaveBeenCalledWith(
      'file:///cache/output/vol.1.epub',
      'content://exports/vol.1.epub',
      { replaceIfDestinationExists: true },
    );
  });

  it('does not append the epub extension twice', async () => {
    const epub = new EpubBuilder(
      {
        title: 'Volume 1',
        fileName: 'vol.1.epub',
        chapters: [{ title: 'Chapter 1', htmlBody: '<p>Chapter</p>' }],
      },
      'content://exports',
    );

    await epub.prepare();
    const outputFile = await epub.save();

    expect(outputFile).toBe('content://exports/vol.1.epub');
    expect(mockCopyFile).toHaveBeenCalledWith(
      'file:///cache/output/vol.1.epub',
      'content://exports/vol.1.epub',
      { replaceIfDestinationExists: true },
    );
  });
});
