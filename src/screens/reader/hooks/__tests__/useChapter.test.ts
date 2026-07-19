import NativeFile from '@specs/NativeFile';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import TTSPlaybackManager from '../../components/Hooks/TTSPlaybackManager';
import useChapter from '../useChapter';

const mockUseNovelActions = jest.fn();
const mockUseChapterGeneralSettings = jest.fn();
const mockUseLibrarySettings = jest.fn();
const mockUseTracker = jest.fn();
const mockUseTrackedNovel = jest.fn();
const mockUseFullscreenMode = jest.fn();

const mockGetDbChapter = jest.fn();
const mockGetChapterCount = jest.fn();
const mockGetNextChapter = jest.fn();
const mockGetPrevChapter = jest.fn();
const mockInsertChapters = jest.fn();
const mockInsertHistory = jest.fn();
const mockFetchChapter = jest.fn();
const mockFetchPage = jest.fn();
const mockSanitizeChapterText = jest.fn();
const mockParseChapterNumber = jest.fn();

const mockUseNovelValue = jest.fn();

jest.mock('@screens/novel/NovelContext', () => ({
  useNovelActions: () => mockUseNovelActions(),
  useNovelValue: (key: string) => mockUseNovelValue(key),
}));

jest.mock('@hooks/persisted', () => ({
  useChapterGeneralSettings: () => mockUseChapterGeneralSettings(),
  useLibrarySettings: () => mockUseLibrarySettings(),
  useTracker: () => mockUseTracker(),
  useTrackedNovel: (...args: unknown[]) => mockUseTrackedNovel(...args),
}));

jest.mock('@hooks', () => ({
  useFullscreenMode: () => mockUseFullscreenMode(),
}));

jest.mock('@database/queries/ChapterQueries', () => ({
  getChapter: (...args: unknown[]) => mockGetDbChapter(...args),
  getChapterCount: (...args: unknown[]) => mockGetChapterCount(...args),
  getNextChapter: (...args: unknown[]) => mockGetNextChapter(...args),
  getPrevChapter: (...args: unknown[]) => mockGetPrevChapter(...args),
  insertChapters: (...args: unknown[]) => mockInsertChapters(...args),
}));

jest.mock('@database/queries/HistoryQueries', () => ({
  insertHistory: (...args: unknown[]) => mockInsertHistory(...args),
}));

jest.mock('@services/plugin/fetch', () => ({
  fetchChapter: (...args: unknown[]) => mockFetchChapter(...args),
  fetchPage: (...args: unknown[]) => mockFetchPage(...args),
}));

jest.mock('../../utils/sanitizeChapterText', () => ({
  sanitizeChapterText: (...args: unknown[]) => mockSanitizeChapterText(...args),
}));

jest.mock('@utils/parseChapterNumber', () => ({
  parseChapterNumber: (...args: unknown[]) => mockParseChapterNumber(...args),
}));

jest.mock('../../components/Hooks/TTSPlaybackManager', () => ({
  __esModule: true,
  default: {
    stopAll: jest.fn(),
  },
}));

const makeChapter = (id: number, page = '1') => ({
  id,
  novelId: 7,
  name: `Chapter ${id}`,
  path: `/chapter/${id}`,
  page,
  position: id,
  unread: true,
  isDownloaded: false,
  bookmark: false,
  progress: 0,
  releaseTime: '2026-01-01',
  updatedTime: '2026-01-01',
  readTime: '2026-01-01',
});

const makeNovel = () => ({
  id: 7,
  pluginId: 'plugin.reader',
  path: '/novel/test',
  name: 'Novel Test',
  totalPages: 3,
  inLibrary: true,
});

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createStore = (
  cacheSeed: Record<number, string | Promise<string>> = {},
) => {
  const cache = new Map<number, string | Promise<string>>(
    Object.entries(cacheSeed).map(([k, v]) => [Number(k), v]),
  );
  const chapterTextCache = {
    read: jest.fn((chapterId: number) => cache.get(chapterId)),
    write: jest.fn((chapterId: number, value: string | Promise<string>) => {
      cache.set(chapterId, value);
    }),
    remove: jest.fn((chapterId: number) => {
      cache.delete(chapterId);
    }),
    clear: jest.fn(() => cache.clear()),
  };
  const state = {
    markChapterRead: jest.fn(),
    updateChapterProgress: jest.fn(),
    chapterTextCache,
    setLastRead: jest.fn(),
  };

  return {
    getState: () => state,
    subscribe: jest.fn(() => () => {}),
    state,
    chapterTextCache,
  };
};

describe('useChapter', () => {
  const initialChapter = makeChapter(1, '1');
  const nextChapter = makeChapter(2, '1');
  const novel = makeNovel();

  beforeEach(() => {
    jest.clearAllMocks();
    (NativeFile.exists as jest.Mock).mockReturnValue(false);
    (NativeFile.readFile as jest.Mock).mockReturnValue('');

    mockUseChapterGeneralSettings.mockReturnValue({
      autoScroll: false,
      autoScrollInterval: 1,
      autoScrollOffset: 100,
      useVolumeButtons: false,
      volumeButtonsOffset: 100,
    });
    mockUseLibrarySettings.mockReturnValue({ incognitoMode: false });
    mockUseTracker.mockReturnValue({ tracker: { id: 'tracker' } });
    mockUseTrackedNovel.mockReturnValue({
      trackedNovel: { progress: 1 },
      updateAllTrackedNovels: jest.fn(),
    });
    mockUseFullscreenMode.mockReturnValue({
      setImmersiveMode: jest.fn(),
      showStatusAndNavBar: jest.fn(),
    });

    mockGetDbChapter.mockResolvedValue(initialChapter);
    mockGetChapterCount.mockResolvedValue(1);
    mockGetNextChapter.mockResolvedValue(undefined);
    mockGetPrevChapter.mockResolvedValue(undefined);
    mockInsertChapters.mockResolvedValue(undefined);
    mockInsertHistory.mockResolvedValue(undefined);
    mockFetchChapter.mockResolvedValue('chapter body');
    mockFetchPage.mockResolvedValue({ chapters: [] });
    mockSanitizeChapterText.mockImplementation(
      (
        _pluginId: string,
        _novelName: string,
        _chapterName: string,
        text: string,
      ) => `SANITIZED:${text}`,
    );
    mockParseChapterNumber.mockReturnValue(5);
  });

  it('uses chapterTextCache on initial load and avoids duplicate fetch for cached chapter text', async () => {
    const store = createStore({ [initialChapter.id]: 'cached chapter body' });
    mockUseNovelActions.mockReturnValue(store.state);

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchChapter).not.toHaveBeenCalled();
    expect(result.current.chapterText).toBe('SANITIZED:cached chapter body');
    expect(store.chapterTextCache.write).not.toHaveBeenCalledWith(
      initialChapter.id,
      expect.anything(),
    );
  });

  it('hydrates the initial chapter from the database before rendering reader progress', async () => {
    const store = createStore({ [initialChapter.id]: 'cached chapter body' });
    const hydratedChapter = { ...initialChapter, progress: 56 };
    mockUseNovelActions.mockReturnValue(store.state);
    mockGetDbChapter.mockResolvedValue(hydratedChapter);

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapter.progress).toBe(56);
  });

  it('uses database progress as the source of truth on initial open', async () => {
    const routeChapter = { ...initialChapter, progress: 72 };
    const dbChapter = { ...initialChapter, progress: 12 };
    const store = createStore({ [initialChapter.id]: 'cached chapter body' });
    mockUseNovelActions.mockReturnValue(store.state);
    mockGetDbChapter.mockResolvedValue(dbChapter);

    const { result } = renderHook(() =>
      useChapter({ current: null }, routeChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapter.progress).toBe(12);
  });

  it('updates chapter progress, caps at 100, and marks chapter read/tracker progress near completion', async () => {
    const store = createStore();
    const updateAllTrackedNovels = jest.fn();
    mockUseTrackedNovel.mockReturnValue({
      trackedNovel: { progress: 2 },
      updateAllTrackedNovels,
    });
    mockUseNovelActions.mockReturnValue(store.state);

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.saveProgress(40);
      result.current.saveProgress(130);
    });

    expect(store.state.updateChapterProgress).toHaveBeenNthCalledWith(
      1,
      initialChapter.id,
      40,
    );
    expect(store.state.updateChapterProgress).toHaveBeenNthCalledWith(
      2,
      initialChapter.id,
      100,
    );
    expect(store.state.markChapterRead).toHaveBeenCalledTimes(1);
    expect(store.state.markChapterRead).toHaveBeenCalledWith(initialChapter.id);
    expect(mockParseChapterNumber).toHaveBeenCalledWith(
      novel.name,
      initialChapter.name,
    );
    expect(updateAllTrackedNovels).toHaveBeenCalledWith({ progress: 5 });
  });

  it('sets error and remains stable when chapter fetch fails', async () => {
    const store = createStore();
    mockUseNovelActions.mockReturnValue(store.state);
    mockFetchChapter.mockRejectedValueOnce(new Error('network failed'));

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, true),
    );

    await waitFor(() => expect(result.current.error).toBe('network failed'));
    expect(result.current.loading).toBe(false);
    expect(result.current.chapterText).toBe('');
  });

  it('reuses prefetched promise cache to avoid duplicate concurrent fetches for same chapter', async () => {
    const store = createStore();
    mockUseNovelActions.mockReturnValue(store.state);

    const deferredNext = createDeferred<string>();

    mockGetNextChapter.mockImplementation(
      async (_novelId: number, position: number) =>
        position === initialChapter.position ? nextChapter : undefined,
    );
    mockFetchChapter.mockImplementation(
      async (_pluginId: string, path: string) => {
        if (path === nextChapter.path) {
          return deferredNext.promise;
        }

        return 'initial body';
      },
    );

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const navPromise = result.current.getChapter({ chapter: nextChapter });

    expect(
      mockFetchChapter.mock.calls.filter(
        ([, path]) => path === nextChapter.path,
      ),
    ).toHaveLength(1);

    await act(async () => {
      deferredNext.resolve('next body');
      await navPromise;
    });

    expect(result.current.chapter.id).toBe(nextChapter.id);
    expect(result.current.chapterText).toBe('SANITIZED:next body');
  });

  it('reloads from source past cached and downloaded content, then remounts with fresh content', async () => {
    const downloadedChapter = { ...initialChapter, isDownloaded: true };
    const store = createStore({
      [downloadedChapter.id]: 'cached chapter body',
    });
    mockUseNovelActions.mockReturnValue(store.state);
    mockGetDbChapter.mockResolvedValue(downloadedChapter);
    (NativeFile.exists as jest.Mock).mockReturnValue(true);
    (NativeFile.readFile as jest.Mock).mockReturnValue(
      'downloaded chapter body',
    );
    mockFetchChapter.mockResolvedValue('fresh source body');

    const { result } = renderHook(() =>
      useChapter({ current: null }, downloadedChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chapterText).toBe('SANITIZED:cached chapter body');
    expect(result.current.readerVersion).toBe(0);

    await act(async () => {
      await result.current.reloadFromSource();
    });

    expect(mockFetchChapter).toHaveBeenCalledWith(
      novel.pluginId,
      downloadedChapter.path,
    );
    expect(NativeFile.readFile).not.toHaveBeenCalled();
    expect(store.chapterTextCache.write).toHaveBeenCalledWith(
      downloadedChapter.id,
      'fresh source body',
    );
    expect(result.current.chapterText).toBe('SANITIZED:fresh source body');
    expect(result.current.readerVersion).toBe(1);
    expect(TTSPlaybackManager.stopAll).toHaveBeenCalledTimes(1);
  });

  it('keeps cached and downloaded content untouched when a source reload fails', async () => {
    const downloadedChapter = { ...initialChapter, isDownloaded: true };
    const store = createStore({
      [downloadedChapter.id]: 'cached chapter body',
    });
    mockUseNovelActions.mockReturnValue(store.state);
    mockGetDbChapter.mockResolvedValue(downloadedChapter);
    (NativeFile.exists as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() =>
      useChapter({ current: null }, downloadedChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchChapter.mockRejectedValueOnce(new Error('source failed'));

    await act(async () => {
      await result.current.reloadFromSource();
    });

    expect(result.current.error).toBe('source failed');
    expect(result.current.loading).toBe(false);
    expect(result.current.chapterText).toBe('SANITIZED:cached chapter body');
    expect(result.current.readerVersion).toBe(0);
    expect(NativeFile.readFile).not.toHaveBeenCalled();
    expect(store.chapterTextCache.remove).not.toHaveBeenCalled();
    expect(store.chapterTextCache.read(downloadedChapter.id)).toBe(
      'cached chapter body',
    );
  });

  it('remounts local-only content without fetching, reading, or clearing cache', async () => {
    const localNovel = { ...novel, pluginId: 'local' };
    const store = createStore({ [initialChapter.id]: 'local chapter body' });
    mockUseNovelActions.mockReturnValue(store.state);

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, localNovel, false),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canReloadFromSource).toBe(true);

    act(() => {
      result.current.reloadFromSource();
    });

    expect(result.current.readerVersion).toBe(1);
    expect(mockFetchChapter).not.toHaveBeenCalled();
    expect(NativeFile.readFile).not.toHaveBeenCalled();
    expect(store.chapterTextCache.remove).not.toHaveBeenCalled();
    expect(store.chapterTextCache.read(initialChapter.id)).toBe(
      'local chapter body',
    );
    expect(TTSPlaybackManager.stopAll).toHaveBeenCalledTimes(1);
  });

  it('remounts a downloaded chapter when its plugin is missing without reading or clearing content', async () => {
    const downloadedChapter = { ...initialChapter, isDownloaded: true };
    const store = createStore({
      [downloadedChapter.id]: 'downloaded chapter body',
    });
    mockUseNovelActions.mockReturnValue(store.state);
    mockGetDbChapter.mockResolvedValue(downloadedChapter);

    const { result } = renderHook(() =>
      useChapter({ current: null }, downloadedChapter, novel, false),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canReloadFromSource).toBe(true);

    act(() => {
      result.current.reloadFromSource();
    });

    expect(result.current.readerVersion).toBe(1);
    expect(mockFetchChapter).not.toHaveBeenCalled();
    expect(NativeFile.readFile).not.toHaveBeenCalled();
    expect(store.chapterTextCache.remove).not.toHaveBeenCalled();
    expect(store.chapterTextCache.read(downloadedChapter.id)).toBe(
      'downloaded chapter body',
    );
    expect(TTSPlaybackManager.stopAll).toHaveBeenCalledTimes(1);
  });

  it('does not reload or remount when the plugin is missing and the chapter is not downloaded', async () => {
    const store = createStore({ [initialChapter.id]: 'cached chapter body' });
    mockUseNovelActions.mockReturnValue(store.state);

    const { result } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, false),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canReloadFromSource).toBe(false);

    act(() => {
      result.current.reloadFromSource();
    });

    expect(result.current.readerVersion).toBe(0);
    expect(mockFetchChapter).not.toHaveBeenCalled();
    expect(NativeFile.readFile).not.toHaveBeenCalled();
    expect(store.chapterTextCache.remove).not.toHaveBeenCalled();
  });

  it('stops managed TTS playback when chapter state is cleaned up', async () => {
    const store = createStore({ [initialChapter.id]: 'cached chapter body' });
    mockUseNovelActions.mockReturnValue(store.state);

    const { result, unmount } = renderHook(() =>
      useChapter({ current: null }, initialChapter, novel, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();

    expect(TTSPlaybackManager.stopAll).toHaveBeenCalledTimes(1);
  });
});
