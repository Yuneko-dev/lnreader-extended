import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Share } from 'react-native';

import { Menu } from '../../../../components';
import ReaderAppbar from '../ReaderAppbar';

const mockUseChapterContext = jest.fn();
const mockResolveUrl = jest.fn();

const mockTheme = {
  id: 0,
  name: 'Test',
  isDark: false,
  primary: '#0057ce',
  onPrimary: '#ffffff',
  primaryContainer: '#dae2ff',
  onPrimaryContainer: '#001946',
  secondary: '#585e71',
  onSecondary: '#ffffff',
  secondaryContainer: '#dce2f9',
  onSecondaryContainer: '#151b2c',
  tertiary: '#725572',
  onTertiary: '#ffffff',
  tertiaryContainer: '#fdd7fa',
  onTertiaryContainer: '#2a122c',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#410002',
  background: '#fefbff',
  onBackground: '#1b1b1f',
  surface: '#fefbff',
  onSurface: '#1b1b1f',
  surfaceVariant: '#e1e2ec',
  onSurfaceVariant: '#44464f',
  outline: '#757780',
  outlineVariant: '#c5c6d0',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#303034',
  inverseOnSurface: '#f2f0f4',
  inversePrimary: '#b1c5ff',
  surfaceDisabled: 'rgba(27, 27, 31, 0.12)',
  onSurfaceDisabled: 'rgba(27, 27, 31, 0.38)',
  backdrop: 'rgba(46, 48, 56, 0.4)',
  rippleColor: '#0000001f',
  surface2: '#f7f2fa',
};

jest.mock('../../ChapterContext', () => ({
  useChapterContext: () => mockUseChapterContext(),
}));

jest.mock('@screens/novel/NovelContext', () => ({
  useNovelLayout: () => ({ statusBarHeight: 24 }),
}));

jest.mock('@hooks/persisted', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@database/queries/ChapterQueries', () => ({
  bookmarkChapter: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@services/plugin/fetch', () => ({
  resolveUrl: (...args: unknown[]) => mockResolveUrl(...args),
}));

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-keyboard-controller', () => ({
  useAnimatedKeyboard: () => ({ height: { value: 0 } }),
}));

const chapter = {
  id: 1,
  novelId: 7,
  name: 'Chapter 1',
  path: '/chapter/1',
  page: '1',
  position: 1,
  unread: true,
  isDownloaded: false,
  bookmark: false,
  progress: 0,
  releaseTime: '2026-01-01',
  updatedTime: '2026-01-01',
  readTime: '2026-01-01',
};

const novel = {
  id: 7,
  pluginId: 'plugin.reader',
  path: '/novel/test',
  name: 'Novel Test',
  totalPages: 1,
  inLibrary: true,
};

const makeSearch = () => ({
  keyboardAvoidanceActive: false,
  visible: false,
  text: '',
  result: {
    query: '',
    current: 0,
    total: 0,
    isDoneCounting: true,
  },
  openSearch: jest.fn(),
  closeSearch: jest.fn(),
  setSearchText: jest.fn(),
  findNext: jest.fn(),
  handleFindResult: jest.fn(),
});

const openMenu = (view: ReturnType<typeof render>) => {
  const menuIcon = view
    .UNSAFE_getAllByType(MaterialCommunityIcons)
    .find(icon => icon.props.name === 'dots-vertical');
  if (!menuIcon) throw new Error('Reader menu icon was not rendered');
  fireEvent.press(menuIcon);
};

const renderAppbar = (openWebView = jest.fn(), search = makeSearch()) =>
  render(
    <ReaderAppbar
      goBack={jest.fn()}
      theme={mockTheme}
      bookmarked={false}
      setBookmarked={jest.fn()}
      openWebView={openWebView}
      search={search}
    />,
  );

describe('ReaderAppbar source menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveUrl.mockReturnValue('https://reader.test/chapter/1');
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  it('renders menu actions in order and disables source-dependent actions', () => {
    const reloadFromSource = jest.fn();
    const openWebView = jest.fn();
    mockUseChapterContext.mockReturnValue({
      chapter,
      novel,
      reloadFromSource,
      canReloadFromSource: false,
      canUseRemoteSource: false,
    });
    const view = renderAppbar(openWebView);

    openMenu(view);

    const menuItems = view.UNSAFE_getAllByType(Menu.Item);
    expect(menuItems.map(item => item.props.title)).toEqual([
      'readerScreen.reloadFromSource',
      'webview.openInWebView',
      'readerScreen.findInChapter',
      'webview.share',
    ]);
    expect(menuItems.map(item => item.props.disabled)).toEqual([
      true,
      true,
      undefined,
      true,
    ]);

    fireEvent.press(screen.getByText('readerScreen.reloadFromSource'));
    fireEvent.press(screen.getByText('webview.openInWebView'));
    fireEvent.press(screen.getByText('webview.share'));

    expect(reloadFromSource).not.toHaveBeenCalled();
    expect(openWebView).not.toHaveBeenCalled();
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('closes the menu before each action and shares the resolved chapter URL', () => {
    const reloadFromSource = jest.fn();
    const openWebView = jest.fn();
    const search = makeSearch();
    mockUseChapterContext.mockReturnValue({
      chapter,
      novel,
      reloadFromSource,
      canReloadFromSource: true,
      canUseRemoteSource: true,
    });
    const view = renderAppbar(openWebView, search);

    openMenu(view);
    fireEvent.press(screen.getByText('readerScreen.reloadFromSource'));
    expect(screen.queryByText('readerScreen.reloadFromSource')).toBeNull();
    expect(reloadFromSource).toHaveBeenCalledTimes(1);

    openMenu(view);
    fireEvent.press(screen.getByText('webview.openInWebView'));
    expect(screen.queryByText('webview.openInWebView')).toBeNull();
    expect(openWebView).toHaveBeenCalledTimes(1);

    openMenu(view);
    fireEvent.press(screen.getByText('readerScreen.findInChapter'));
    expect(screen.queryByText('readerScreen.findInChapter')).toBeNull();
    expect(search.openSearch).toHaveBeenCalledTimes(1);

    openMenu(view);
    fireEvent.press(screen.getByText('webview.share'));
    expect(screen.queryByText('webview.share')).toBeNull();
    expect(mockResolveUrl).toHaveBeenCalledWith(novel.pluginId, chapter.path);
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://reader.test/chapter/1',
    });
  });
});
