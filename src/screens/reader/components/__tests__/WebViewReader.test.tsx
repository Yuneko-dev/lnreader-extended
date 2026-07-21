import type { ChapterInfo, NovelInfo } from '@database/types';
import type {
  ChapterGeneralSettings,
  ChapterReaderSettings,
} from '@hooks/persisted/useSettings';
import { render } from '@testing-library/react-native';
import React from 'react';

import WebViewReader from '../WebViewReader';

const mockStopNativePlayback = jest.fn();
const mockInjectJavaScript = jest.fn();
const mockUseReaderSettingsBridge = jest.fn();

let mockReaderSettings: ChapterReaderSettings;
let mockGeneralSettings: ChapterGeneralSettings;
let mockChapterContext: Record<string, unknown>;
let mockLatestWebViewProps: Record<string, unknown> | undefined;

const mockTheme = {
  id: 0,
  name: 'Test',
  isDark: true,
  primary: '#ffffff',
  onPrimary: '#000000',
  primaryContainer: '#333333',
  onPrimaryContainer: '#ffffff',
  secondary: '#eeeeee',
  onSecondary: '#111111',
  secondaryContainer: '#444444',
  onSecondaryContainer: '#ffffff',
  tertiary: '#dddddd',
  onTertiary: '#222222',
  tertiaryContainer: '#555555',
  onTertiaryContainer: '#ffffff',
  error: '#ff0000',
  onError: '#ffffff',
  errorContainer: '#660000',
  onErrorContainer: '#ffffff',
  background: '#111111',
  onBackground: '#ffffff',
  surface: '#222222',
  onSurface: '#ffffff',
  surfaceVariant: '#333333',
  onSurfaceVariant: '#eeeeee',
  outline: '#aaaaaa',
  outlineVariant: '#777777',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#ffffff',
  inverseOnSurface: '#000000',
  inversePrimary: '#111111',
  surfaceDisabled: '#22222266',
  onSurfaceDisabled: '#ffffff66',
  backdrop: '#00000099',
  rippleColor: '#ffffff1f',
  surface2: '#292929',
};

const mockTTS = {
  handleLoadEnd: jest.fn(),
  handlePause: jest.fn(),
  handleQueue: jest.fn(),
  handleSpeak: jest.fn(),
  handleState: jest.fn(),
  handleStop: jest.fn(),
  scheduleAutoStart: jest.fn(),
  stopNativePlayback: mockStopNativePlayback,
};

jest.mock('../../ChapterContext', () => ({
  useChapterContext: () => mockChapterContext,
}));

jest.mock('@hooks/persisted', () => ({
  useChapterGeneralSettings: () => mockGeneralSettings,
  useChapterReaderSettings: () => mockReaderSettings,
  useTheme: () => mockTheme,
}));

jest.mock('@plugins/local/localServerManager', () => ({
  getLocalServerUrl: () => 'http://127.0.0.1:1234',
}));

jest.mock('expo-screen-orientation', () => ({
  unlockAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-device-info', () => ({
  getBatteryLevelSync: () => 0.75,
}));

jest.mock('../Hooks/useReaderSettings', () => ({
  useReaderSettingsBridge: (options: unknown) =>
    mockUseReaderSettingsBridge(options),
}));

jest.mock('../Hooks/useReadingTime', () => ({
  __esModule: true,
  default: () => ({}),
}));

jest.mock('../Hooks/useTTS', () => ({
  __esModule: true,
  default: () => mockTTS,
}));

jest.mock('../ReaderWebView/ReaderWebViewCore', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockLatestWebViewProps = props;
    return null;
  },
}));

const novel: NovelInfo = {
  id: 7,
  path: '/novel/test',
  pluginId: 'plugin.reader',
  name: 'Novel Test',
  cover: 'https://reader.test/cover.jpg',
  summary: 'Summary',
  author: 'Author',
  artist: 'Artist',
  status: 'Ongoing',
  genres: 'Fantasy',
  inLibrary: true,
  isLocal: false,
  totalPages: 2,
};

const chapter: ChapterInfo = {
  id: 10,
  novelId: novel.id,
  path: '/chapter/1',
  name: 'Chapter One',
  releaseTime: '2026-01-01',
  bookmark: false,
  unread: false,
  readTime: '2026-01-02',
  isDownloaded: false,
  updatedTime: '2026-01-03',
  chapterNumber: 1,
  page: '1',
  position: 1,
  progress: 17,
  scanlator: 'Original Team',
};

const nextChapter: ChapterInfo = {
  ...chapter,
  id: 11,
  path: '/chapter/2',
  name: 'Chapter Two',
  chapterNumber: 2,
  position: 2,
  progress: 0,
};

const prevChapter: ChapterInfo = {
  ...chapter,
  id: 9,
  path: '/chapter/0',
  name: 'Chapter Zero',
  chapterNumber: 0,
  position: 0,
  progress: 100,
};

const createReaderSettings = (): ChapterReaderSettings => ({
  theme: '#111111',
  textColor: '#eeeeee',
  textSize: 16,
  textAlign: 'left',
  padding: 16,
  paragraphIndent: 0,
  paragraphSpacing: 1,
  fontFamily: '',
  lineHeight: 1.5,
  codeSnippetsCSS: [],
  codeSnippetsJS: [],
  regexReplacements: [],
  pluginUseCustomCSS: true,
  pluginUseCustomJS: true,
  customThemes: [],
  tts: {
    engine: 'native',
    rate: 1,
    pitch: 1,
    queueSize: 3,
    autoPageAdvance: false,
    scrollToTop: true,
  },
  epubLocation: '',
  epubUseAppTheme: false,
  epubUseCustomCSS: false,
  epubUseCustomJS: false,
});

const createGeneralSettings = (): ChapterGeneralSettings => ({
  keepScreenOn: true,
  fullScreenMode: true,
  pageReader: false,
  swipeGestures: false,
  showScrollPercentage: true,
  useVolumeButtons: false,
  volumeButtonsOffset: null,
  showBatteryAndTime: false,
  autoScroll: false,
  autoScrollInterval: 10,
  autoScrollOffset: null,
  verticalSeekbar: true,
  removeExtraParagraphSpacing: false,
  bionicReading: false,
  tapToScroll: false,
  TTSEnable: true,
  einkRefreshOnPageTurn: false,
});

const source = () => {
  const currentSource = mockLatestWebViewProps?.source as
    | { html: string }
    | undefined;
  if (!currentSource) throw new Error('Reader source was not captured');
  return currentSource;
};

const renderReader = () =>
  render(
    <WebViewReader
      onPress={jest.fn()}
      onFindResult={jest.fn()}
      bottomInset={24}
    />,
  );

const rerenderReader = (view: ReturnType<typeof render>) =>
  view.rerender(
    <WebViewReader
      onPress={jest.fn()}
      onFindResult={jest.fn()}
      bottomInset={24}
    />,
  );

describe('WebViewReader document lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReaderSettings = createReaderSettings();
    mockGeneralSettings = createGeneralSettings();
    mockChapterContext = {
      novel,
      plugin: {
        id: novel.pluginId,
        name: 'Reader Plugin',
        site: 'https://reader.test',
        lang: 'English',
        version: '1.0.0',
        url: 'https://reader.test/plugin.js',
        iconUrl: 'https://reader.test/icon.png',
        imageRequestInit: {
          headers: { Referer: 'https://reader.test' },
          method: 'GET',
        },
        popularNovels: jest.fn(),
        parseNovel: jest.fn(),
        parseChapter: jest.fn(),
        searchNovels: jest.fn(),
      },
      chapter,
      chapterText: '<p>Original chapter body</p>',
      navigateChapter: jest.fn(),
      saveProgress: jest.fn(),
      nextChapter,
      prevChapter,
      webViewRef: { current: { injectJavaScript: mockInjectJavaScript } },
      resetAutoScroll: jest.fn(),
      refetch: jest.fn(),
    };
    mockLatestWebViewProps = undefined;
  });

  it('rebuilds for same-ID current and adjacent metadata changes', () => {
    const view = renderReader();
    const initialSource = source();

    mockChapterContext = {
      ...mockChapterContext,
      chapter: {
        ...chapter,
        name: 'Chapter One Revised',
        updatedTime: '2026-02-01',
        scanlator: 'Revised Team',
      },
      nextChapter: {
        ...nextChapter,
        name: 'Chapter Two Revised',
        scanlator: 'Adjacent Team',
      },
      prevChapter: {
        ...prevChapter,
        releaseTime: '2025-12-31',
      },
    };
    rerenderReader(view);

    const revisedSource = source();
    expect(revisedSource).not.toBe(initialSource);
    expect(revisedSource.html).toContain('Chapter One Revised');
    expect(revisedSource.html).toContain('"scanlator":"Revised Team"');
    expect(revisedSource.html).toContain('Chapter Two Revised');
    expect(revisedSource.html).toContain('"scanlator":"Adjacent Team"');
    expect(revisedSource.html).toContain('"releaseTime":"2025-12-31"');
  });

  it('bridges cosmetic settings without rebuilding or stopping TTS', () => {
    const view = renderReader();
    const initialSource = source();
    mockStopNativePlayback.mockClear();
    mockUseReaderSettingsBridge.mockClear();

    mockReaderSettings = { ...mockReaderSettings, textSize: 24 };
    rerenderReader(view);

    expect(source()).toBe(initialSource);
    expect(mockUseReaderSettingsBridge).toHaveBeenLastCalledWith(
      expect.objectContaining({
        readerSettings: expect.objectContaining({ textSize: 24 }),
      }),
    );
    expect(mockStopNativePlayback).not.toHaveBeenCalled();
  });

  it('rebuilds and stops TTS once for each document-changing setting', () => {
    const view = renderReader();
    let previousSource = source();

    const expectRevision = () => {
      rerenderReader(view);
      expect(source()).not.toBe(previousSource);
      expect(mockStopNativePlayback).toHaveBeenCalledTimes(1);
      previousSource = source();
      mockStopNativePlayback.mockClear();
    };

    mockReaderSettings = {
      ...mockReaderSettings,
      pluginUseCustomJS: false,
    };
    expectRevision();

    mockReaderSettings = {
      ...mockReaderSettings,
      pluginUseCustomCSS: false,
    };
    expectRevision();

    mockGeneralSettings = {
      ...mockGeneralSettings,
      bionicReading: true,
    };
    expectRevision();

    mockGeneralSettings = {
      ...mockGeneralSettings,
      removeExtraParagraphSpacing: true,
    };
    expectRevision();
  });

  it('does not rebuild or stop TTS when only progress changes', () => {
    const view = renderReader();
    const initialSource = source();
    mockStopNativePlayback.mockClear();

    mockChapterContext = {
      ...mockChapterContext,
      chapter: { ...chapter, progress: 88 },
      nextChapter: { ...nextChapter, progress: 64 },
      prevChapter: { ...prevChapter, progress: 42 },
    };
    rerenderReader(view);

    expect(source()).toBe(initialSource);
    expect(mockStopNativePlayback).not.toHaveBeenCalled();
  });
});
