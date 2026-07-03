import { act, renderHook, waitFor } from '@testing-library/react-native';

import useChapterTranslation from '../useChapterTranslation';

const mockTranslateChapterHTML = jest.fn();
const mockGetTranslateConfigSnapshot = jest.fn();
const mockShowToast = jest.fn();
const mockImpactAsync = jest.fn((_style?: unknown) => Promise.resolve());

jest.mock('@services/translate/TranslateManager', () => ({
  TranslateManager: {
    translateChapterHTML: (...args: unknown[]) =>
      mockTranslateChapterHTML(...args),
  },
}));

jest.mock('@services/translate/getTranslateConfig', () => ({
  getTranslateConfigSnapshot: () => mockGetTranslateConfigSnapshot(),
}));

jest.mock('@utils/showToast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

jest.mock('@utils/mmkv/mmkv', () => ({
  getMMKVObject: () => ({ disableHapticFeedback: false }),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'medium' },
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
}));

jest.mock('../../utils/sanitizeChapterText', () => ({
  sanitizeChapterText: (
    _pluginId: string,
    _novelName: string,
    _chapterName: string,
    text: string,
  ) => `SANITIZED:${text}`,
}));

const chapter = (id: number) =>
  ({
    id,
    novelId: 7,
    name: `Chapter ${id}`,
    path: `/chapter/${id}`,
    page: '1',
    position: id,
  } as any);

const novel = {
  id: 7,
  pluginId: 'plugin.reader',
  name: 'Novel',
  path: '/novel',
} as any;

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

const makeSnapshot = (configKey = 'config-a', autoTranslate = true) => ({
  config: {
    engine: 'google-free',
    sourceLang: 'auto',
    targetLang: 'en',
  },
  configKey,
  settings: { autoTranslateNextChapter: autoTranslate },
});

const setup = () => {
  const cache = new Map<number, string | Promise<string>>([[2, 'body-2']]);
  const chapterTextCache = {
    read: jest.fn((id: number) => cache.get(id)),
  };
  const loadChapterText = jest.fn(async (id: number) => `body-${id}`);
  const utils = renderHook(() =>
    useChapterTranslation({ chapterTextCache, loadChapterText, novel }),
  );
  return { ...utils, chapterTextCache, loadChapterText };
};

describe('useChapterTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTranslateConfigSnapshot.mockReturnValue(makeSnapshot());
  });

  it('uses one foreground pipeline and preserves the old translation when re-translate fails', async () => {
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockRejectedValueOnce(new Error('failed'));
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(1),
        isOffline: false,
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });

    await waitFor(() =>
      expect(result.current.chapterText).toBe('translated-a'),
    );
    expect(result.current.isTranslated).toBe(true);

    act(() => {
      result.current.retranslateChapter();
      result.current.retranslateChapter();
    });
    await waitFor(() => expect(result.current.isTranslating).toBe(false));

    expect(result.current.chapterText).toBe('translated-a');
    expect(result.current.isTranslated).toBe(true);
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('failed');
  });

  it('cancels a queued re-translate on navigation and still attaches the useful background job', async () => {
    const background = createDeferred<string>();
    const signals: AbortSignal[] = [];
    mockTranslateChapterHTML.mockImplementation(
      (_html, _config, _progress, signal: AbortSignal) => {
        signals.push(signal);
        return signals.length === 1
          ? Promise.resolve('translated-a')
          : background.promise;
      },
    );
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: true,
        chapter: chapter(1),
        isOffline: false,
        nextChapter: chapter(2),
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );

    act(() => result.current.retranslateChapter());
    expect(result.current.isTranslating).toBe(true);
    expect(result.current.isTranslated).toBe(true);

    act(() => {
      result.current.prepareNavigation(2);
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(2),
        isOffline: false,
        sourceHtml: 'original-b',
      });
    });

    await act(async () => background.resolve('translated-b'));
    await waitFor(() =>
      expect(result.current.chapterText).toBe('translated-b'),
    );

    expect(signals[1].aborted).toBe(false);
    expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2);
    expect(result.current.isTranslated).toBe(true);
  });

  it('cancels only the queued foreground operation when the translate icon is pressed', async () => {
    const background = createDeferred<string>();
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockReturnValueOnce(background.promise);
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: true,
        chapter: chapter(1),
        isOffline: false,
        nextChapter: chapter(2),
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );

    act(() => result.current.retranslateChapter());
    act(() => result.current.translateChapter());

    expect(result.current.isTranslating).toBe(false);
    expect(result.current.isTranslated).toBe(true);
    expect(result.current.chapterText).toBe('translated-a');

    await act(async () => background.resolve('translated-b'));
    expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2);
  });

  it('aborts a pending pre-translation when reverting to the original content', async () => {
    const background = createDeferred<string>();
    let backgroundSignal: AbortSignal | undefined;
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockImplementationOnce((_html, _config, _progress, signal) => {
        backgroundSignal = signal;
        return background.promise;
      });
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: true,
        chapter: chapter(1),
        isOffline: false,
        nextChapter: chapter(2),
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );

    act(() => result.current.translateChapter());
    expect(backgroundSignal?.aborted).toBe(true);
    expect(result.current.chapterText).toBe('original-a');

    act(() => {
      result.current.prepareNavigation(2);
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(2),
        isOffline: false,
        sourceHtml: 'original-b',
      });
    });
    await act(async () => background.resolve('late-translation-b'));

    expect(result.current.chapterText).toBe('original-b');
    expect(result.current.isTranslating).toBe(false);
    expect(result.current.isTranslated).toBe(false);
  });

  it('clears a completed pre-translation cache when reverting to the original content', async () => {
    const background = createDeferred<string>();
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockReturnValueOnce(background.promise);
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: true,
        chapter: chapter(1),
        isOffline: false,
        nextChapter: chapter(2),
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );
    await act(async () => background.resolve('translated-b'));

    act(() => {
      result.current.translateChapter();
      result.current.prepareNavigation(2);
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(2),
        isOffline: false,
        sourceHtml: 'original-b',
      });
    });

    expect(result.current.chapterText).toBe('original-b');
    expect(result.current.isTranslated).toBe(false);
  });

  it('hydrates and continues background progress after navigating to its target chapter', async () => {
    const background = createDeferred<string>();
    let reportBackgroundProgress: ((progress: number) => void) | undefined;
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockImplementationOnce((_html, _config, onProgress) => {
        reportBackgroundProgress = onProgress;
        return background.promise;
      });
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: true,
        chapter: chapter(1),
        isOffline: false,
        nextChapter: chapter(2),
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );
    act(() => reportBackgroundProgress?.(35));

    act(() => {
      result.current.prepareNavigation(2);
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(2),
        isOffline: false,
        sourceHtml: 'original-b',
      });
    });
    expect(result.current.translateProgress).toBe(35);

    act(() => reportBackgroundProgress?.(70));
    expect(result.current.translateProgress).toBe(70);
    await act(async () => background.resolve('translated-b'));
    expect(result.current.translateProgress).toBe(100);
  });

  it('rejects a stale-config background job when its target chapter opens', async () => {
    const background = createDeferred<string>();
    let backgroundSignal: AbortSignal | undefined;
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockImplementationOnce((_html, _config, _progress, signal) => {
        backgroundSignal = signal;
        return background.promise;
      });
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: true,
        chapter: chapter(1),
        isOffline: false,
        nextChapter: chapter(2),
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );
    mockGetTranslateConfigSnapshot.mockReturnValue(makeSnapshot('config-b'));

    act(() => {
      result.current.prepareNavigation(2);
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(2),
        isOffline: false,
        sourceHtml: 'original-b',
      });
    });

    expect(backgroundSignal?.aborted).toBe(true);
    expect(result.current.chapterText).toBe('original-b');
    expect(result.current.isTranslating).toBe(false);
  });

  it('aborts an active re-translate on navigation and ignores its late result', async () => {
    const retranslation = createDeferred<string>();
    let reportProgress: ((progress: number) => void) | undefined;
    let retranslateSignal: AbortSignal | undefined;
    mockTranslateChapterHTML
      .mockResolvedValueOnce('translated-a')
      .mockImplementationOnce((_html, _config, onProgress, signal) => {
        reportProgress = onProgress;
        retranslateSignal = signal;
        return retranslation.promise;
      });
    mockGetTranslateConfigSnapshot.mockReturnValue(
      makeSnapshot('config-a', false),
    );
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(1),
        isOffline: false,
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    await waitFor(() =>
      expect(result.current.chapterText).toBe('translated-a'),
    );
    act(() => result.current.retranslateChapter());
    await waitFor(() =>
      expect(mockTranslateChapterHTML).toHaveBeenCalledTimes(2),
    );

    act(() => {
      result.current.prepareNavigation(2);
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(2),
        isOffline: false,
        sourceHtml: 'original-b',
      });
    });
    expect(retranslateSignal?.aborted).toBe(true);
    act(() => reportProgress?.(90));

    await act(async () => retranslation.resolve('late-translation-a'));
    expect(result.current.chapterText).toBe('original-b');
    expect(result.current.isTranslated).toBe(false);
    expect(result.current.translateProgress).toBe(0);
  });

  it('blocks all translation actions for offline content', () => {
    const { result } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(1),
        isOffline: true,
        sourceHtml: 'offline-translation',
      });
      result.current.translateChapter();
      result.current.retranslateChapter();
    });

    expect(result.current.isOfflineTranslated).toBe(true);
    expect(result.current.chapterText).toBe('offline-translation');
    expect(mockTranslateChapterHTML).not.toHaveBeenCalled();
  });

  it('aborts active work and ignores late completion after unmount', async () => {
    const foreground = createDeferred<string>();
    let signal: AbortSignal | undefined;
    mockTranslateChapterHTML.mockImplementation(
      (_html, _config, _progress, receivedSignal) => {
        signal = receivedSignal;
        return foreground.promise;
      },
    );
    const { result, unmount } = setup();

    act(() => {
      result.current.activateChapter({
        allowPrefetch: false,
        chapter: chapter(1),
        isOffline: false,
        sourceHtml: 'original-a',
      });
      result.current.translateChapter();
    });
    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => foreground.resolve('late-result'));
  });
});
