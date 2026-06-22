/**
 * Unit tests for useImport — file intent import flow.
 *
 * Tests URI validation, filename extraction, confirm/cancel flow,
 * cooldown deduplication, and cleanup on unmount.
 *
 * The DocumentPicker import flow (importNovel) is covered implicitly
 * by existing LibraryScreen tests.
 */
import ServiceManager from '@services/ServiceManager';
import NativeFile from '@specs/NativeFile';
import { act, renderHook } from '@testing-library/react-native';
import { showToast } from '@utils/showToast';
import { Linking } from 'react-native';

import { __resetEpubIntentState, useEpubFileIntent } from '../useImport';

// Mock LibraryContext: the useImport module imports it at load time
// (the default useImport hook uses it), which would otherwise pull in
// the real MMKV chain.
jest.mock('@components/Context/LibraryContext', () => ({
  useLibraryContext: jest.fn(() => ({
    refetchLibrary: jest.fn(),
  })),
}));

// Mock ServiceManager
jest.mock('@services/ServiceManager', () => ({
  __esModule: true,
  default: {
    manager: {
      STORE_KEY: 'MOCK_STORE_KEY',
      addTask: jest.fn(),
      resume: jest.fn(),
      pause: jest.fn(),
      removeTasksByName: jest.fn(),
    },
  },
}));

// Mock showToast
jest.mock('@utils/showToast', () => ({
  showToast: jest.fn(),
}));

// Mock getString
jest.mock('@strings/translations', () => ({
  getString: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'notifications.IMPORT_EPUB': 'Importing EPUB',
      'common.cancel': 'Cancel',
      'libraryScreen.extraMenu.importEpub': 'Import Epub',
    };
    return map[key] || key;
  }),
}));

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  useMMKVObject: jest.fn(() => [undefined]),
  MMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(() => false),
  })),
}));

// Mock react-native-quick-crypto
jest.mock('react-native-quick-crypto', () => ({
  randomUUID: jest.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
}));

// Capture Linking listener
let mockLinkingCallback: ((event: { url: string }) => void) | null = null;
const mockRemove = jest.fn(() => {
  mockLinkingCallback = null;
});

jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
jest
  .spyOn(Linking, 'addEventListener')
  .mockImplementation(
    (_event: string, callback: (event: { url: string }) => void) => {
      mockLinkingCallback = callback;
      return { remove: mockRemove } as any;
    },
  );

describe('useImport — file intent import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkingCallback = null;
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    __resetEpubIntentState();
  });

  describe('URI validation', () => {
    it('should not trigger for null initial URL', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.pendingFileImport).toBeNull();
    });

    it('should not trigger for non-epub content:// URI', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://com.android/my-epub-notes.txt',
        });
      });
      expect(result.current.pendingFileImport).toBeNull();
    });

    it('should not trigger for http:// URLs even with .epub', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({ url: 'http://example.com/book.epub' });
      });
      expect(result.current.pendingFileImport).toBeNull();
    });

    it('should not trigger for lnreader:// scheme', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({ url: 'lnreader://import?file=test.epub' });
      });
      expect(result.current.pendingFileImport).toBeNull();
    });

    it('should trigger for content:// URI ending with .epub', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://downloads/test-novel.epub',
        });
      });
      expect(result.current.pendingFileImport).not.toBeNull();
      expect(result.current.pendingFileImport?.filename).toBe(
        'test-novel.epub',
      );
    });

    it('should trigger for content:// URI without extension when display name is .epub', async () => {
      (NativeFile.getFileName as jest.Mock).mockReturnValueOnce(
        'My Novel.epub',
      );

      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://com.android.providers.downloads.documents/document/1234',
        });
      });
      expect(result.current.pendingFileImport).not.toBeNull();
      expect(result.current.pendingFileImport?.filename).toBe('My Novel.epub');
    });

    it('should not trigger for content:// URI when display name is not .epub', async () => {
      (NativeFile.getFileName as jest.Mock).mockReturnValueOnce('notes.txt');

      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://com.android.providers.downloads.documents/document/9999',
        });
      });
      expect(result.current.pendingFileImport).toBeNull();
    });

    it('should trigger for file:// URI ending with .epub', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'file:///storage/emulated/0/Download/my-book.epub',
        });
      });
      expect(result.current.pendingFileImport).not.toBeNull();
      expect(result.current.pendingFileImport?.filename).toBe('my-book.epub');
    });

    it('should handle .epub URIs with query parameters', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://downloads/novel.epub?source=browser',
        });
      });
      expect(result.current.pendingFileImport).not.toBeNull();
    });

    it('should be case-insensitive for .EPUB extension', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({ url: 'content://downloads/NOVEL.EPUB' });
      });
      expect(result.current.pendingFileImport).not.toBeNull();
    });
  });

  describe('cold start (getInitialURL)', () => {
    it('should process EPUB URI on cold start', async () => {
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(
        'content://downloads/cold-start.epub',
      );
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.pendingFileImport).not.toBeNull();
      expect(result.current.pendingFileImport?.uri).toBe(
        'content://downloads/cold-start.epub',
      );
      expect(result.current.pendingFileImport?.filename).toBe(
        'cold-start.epub',
      );
    });

    it('should not re-prompt for the same launch URL after a remount', async () => {
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(
        'content://downloads/cold-start.epub',
      );

      const { result: firstResult, unmount } = renderHook(() =>
        useEpubFileIntent(),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(firstResult.current.pendingFileImport).not.toBeNull();
      unmount();

      // getInitialURL still returns the same launch URL on remount.
      const { result: secondResult } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });
      expect(secondResult.current.pendingFileImport).toBeNull();
    });
  });

  describe('confirm / cancel flow', () => {
    it('should clear pendingFileImport on cancel', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({ url: 'content://downloads/book.epub' });
      });
      expect(result.current.pendingFileImport).not.toBeNull();

      act(() => {
        result.current.cancelFileImport();
      });
      expect(result.current.pendingFileImport).toBeNull();
      expect(ServiceManager.manager.addTask).not.toHaveBeenCalled();
    });

    it('should add IMPORT_EPUB task and show toast on confirm', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({ url: 'content://downloads/novel.epub' });
      });

      act(() => {
        result.current.confirmFileImport();
      });

      expect(ServiceManager.manager.addTask).toHaveBeenCalledWith({
        name: 'IMPORT_EPUB',
        data: {
          uri: 'content://downloads/novel.epub',
          filename: 'novel.epub',
        },
      });
      expect(showToast).toHaveBeenCalledWith('Importing EPUB: novel.epub');
      expect(result.current.pendingFileImport).toBeNull();
    });

    it('should do nothing when confirming with no pending import', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.confirmFileImport();
      });
      expect(ServiceManager.manager.addTask).not.toHaveBeenCalled();
    });
  });

  describe('re-processing', () => {
    it('should re-open the dialog when the same URI arrives after cancel', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      const url = 'content://downloads/dupe.epub';

      act(() => {
        mockLinkingCallback?.({ url });
      });
      expect(result.current.pendingFileImport?.filename).toBe('dupe.epub');

      act(() => {
        result.current.cancelFileImport();
      });
      expect(result.current.pendingFileImport).toBeNull();

      act(() => {
        mockLinkingCallback?.({ url });
      });
      expect(result.current.pendingFileImport?.filename).toBe('dupe.epub');
    });

    it('should update pending import for each new URI', async () => {
      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({ url: 'content://downloads/book1.epub' });
      });
      expect(result.current.pendingFileImport?.filename).toBe('book1.epub');

      act(() => {
        mockLinkingCallback?.({ url: 'content://downloads/book2.epub' });
      });
      expect(result.current.pendingFileImport?.filename).toBe('book2.epub');
    });
  });

  describe('filename extraction', () => {
    it('should use NativeFile.getFileName with fallback arg', async () => {
      (NativeFile.getFileName as jest.Mock).mockReturnValueOnce(
        'Proper Name.epub',
      );

      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://media/external/file/123.epub',
        });
      });

      expect(NativeFile.getFileName).toHaveBeenCalledWith(
        'content://media/external/file/123.epub',
        expect.stringMatching(/^[a-f0-9]{8}\.epub$/),
      );
      expect(result.current.pendingFileImport?.filename).toBe(
        'Proper Name.epub',
      );
    });

    it('should use the random fallback when NativeFile throws', async () => {
      (NativeFile.getFileName as jest.Mock).mockImplementationOnce(() => {
        throw new Error('ContentResolver failed');
      });

      const { result } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        mockLinkingCallback?.({
          url: 'content://downloads/fallback-test.epub',
        });
      });
      expect(result.current.pendingFileImport?.filename).toMatch(
        /^[a-f0-9]{8}\.epub$/,
      );
    });
  });

  describe('cleanup', () => {
    it('should remove Linking listener on unmount', async () => {
      const { unmount } = renderHook(() => useEpubFileIntent());
      await act(async () => {
        await Promise.resolve();
      });

      unmount();
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
