import { copyFile } from 'react-native-saf-x';

import EpubBuilder from '../main';

const mockConstructEpub = jest.fn();
const mockZipEpub = jest.fn();
const mockDetectImageMimeType = jest.fn();
const mockNativeExists = jest.fn();
const mockReadDir = jest.fn();
const mockNativeReadFile = jest.fn();
const mockNativeWriteFile = jest.fn();

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
  detectImageMimeType: (...args: unknown[]) => mockDetectImageMimeType(...args),
  exists: (...args: unknown[]) => mockNativeExists(...args),
  readDir: (...args: unknown[]) => mockReadDir(...args),
  readFile: (...args: unknown[]) => mockNativeReadFile(...args),
  writeFile: (...args: unknown[]) => mockNativeWriteFile(...args),
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
    mockReadDir.mockReturnValue([]);
    mockNativeExists.mockReturnValue(false);
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
      expect.stringMatching(
        /^file:\/\/\/cache\/epubOutput\/[^/]+\/vol\.1\.epub$/,
      ),
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
      expect.stringMatching(
        /^file:\/\/\/cache\/epubOutput\/[^/]+\/vol\.1\.epub$/,
      ),
      'content://exports/vol.1.epub',
      { replaceIfDestinationExists: true },
    );
  });

  it('patches all detected image MIME types with one OPF write', async () => {
    mockConstructEpub.mockResolvedValue([]);
    mockReadDir.mockReturnValue([
      { name: 'one.jpg', path: '/tmp/one.jpg', isDirectory: false },
      { name: 'two.png', path: '/tmp/two.png', isDirectory: false },
    ]);
    mockNativeExists.mockReturnValue(true);
    mockDetectImageMimeType
      .mockReturnValueOnce('image/png')
      .mockReturnValueOnce('image/jpeg');
    mockNativeReadFile.mockReturnValue(
      '<manifest><item href="images/one.jpg" media-type="image/jpeg"/><item href="images/two.png" media-type="image/png"/></manifest>',
    );

    const epub = new EpubBuilder(
      {
        title: 'Images',
        chapters: [{ title: 'Chapter 1', htmlBody: '<p>Chapter</p>' }],
      },
      'content://exports',
    );

    await epub.prepare();
    await epub.save();

    expect(mockNativeWriteFile).toHaveBeenCalledTimes(1);
    expect(mockNativeWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/EPUB\/package\.opf$/),
      '<manifest><item href="images/one.jpg" media-type="image/png"/><item href="images/two.png" media-type="image/jpeg"/></manifest>',
    );
  });
});
