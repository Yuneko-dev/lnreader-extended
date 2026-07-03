import { getNovelDownloadedChapters } from '@database/queries/ChapterQueries';
import { NovelInfo } from '@database/types';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import ExportEpubLogsModal from '../ExportEpubLogsModal';

const mockPrepare = jest.fn();
const mockAddChapter = jest.fn();
const mockSave = jest.fn();
const mockDiscardChanges = jest.fn();
const mockFileExists = jest.fn();
const mockReadFile = jest.fn();
let mockTaskLogDialogProps:
  | { onDismiss: () => void; running: boolean }
  | undefined;

jest.mock('@components', () => {
  const ReactModule = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    Button: ({ children }: { children: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
    TaskLogDialog: (props: { onDismiss: () => void; running: boolean }) => {
      mockTaskLogDialogProps = props;
      return ReactModule.createElement(View);
    },
  };
});

jest.mock('@hooks', () => ({
  useBufferedLogs: jest.requireActual('@hooks/common/useBufferedLogs').default,
}));

jest.mock('@database/queries/ChapterQueries', () => ({
  getNovelDownloadedChapters: jest.fn(),
}));
jest.mock('@modules/react-native-epub-creator', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    addChapter: (...args: unknown[]) => mockAddChapter(...args),
    discardChanges: (...args: unknown[]) => mockDiscardChanges(...args),
    prepare: (...args: unknown[]) => mockPrepare(...args),
    save: (...args: unknown[]) => mockSave(...args),
  })),
}));
jest.mock('@services/plugin/fetch', () => ({ resolveUrl: jest.fn() }));
jest.mock('@specs/NativeFile', () => ({
  exists: (...args: unknown[]) => mockFileExists(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));
jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));
jest.mock('@utils/constants/metadata', () => ({ APP_NAME: 'LNReader' }));
jest.mock('@utils/showToast', () => ({ showToast: jest.fn() }));
jest.mock('@utils/Storages', () => ({ NOVEL_STORAGE: '/novels' }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));

const mockGetNovelDownloadedChapters =
  getNovelDownloadedChapters as jest.MockedFunction<
    typeof getNovelDownloadedChapters
  >;

const novel = {
  id: 1,
  name: 'Test Novel',
  path: '/test',
  pluginId: 'test-plugin',
} as NovelInfo;

const chapters = [
  {
    chapterNumber: 1,
    id: 11,
    name: 'Chapter 1',
  },
] as Awaited<ReturnType<typeof getNovelDownloadedChapters>>;

describe('ExportEpubLogsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskLogDialogProps = undefined;
    mockGetNovelDownloadedChapters.mockResolvedValue([]);
    mockPrepare.mockResolvedValue(undefined);
    mockSave.mockResolvedValue('/exports/test.epub');
    mockDiscardChanges.mockResolvedValue(undefined);
    mockFileExists.mockReturnValue(true);
    mockReadFile.mockReturnValue('<p>Chapter</p>');
    global.requestAnimationFrame = jest.fn(callback => {
      callback(0);
      return 1;
    });
  });

  it('does not restart export while the parent is closing the visible dialog', async () => {
    const onDismiss = jest.fn();
    const view = render(
      <ExportEpubLogsModal
        visible
        onDismiss={onDismiss}
        novel={novel}
        destinationUri="content://exports"
      />,
    );

    await waitFor(() =>
      expect(mockGetNovelDownloadedChapters).toHaveBeenCalledTimes(1),
    );

    act(() => {
      mockTaskLogDialogProps?.onDismiss();
    });
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    expect(mockGetNovelDownloadedChapters).toHaveBeenCalledTimes(1);

    view.rerender(
      <ExportEpubLogsModal
        visible={false}
        onDismiss={onDismiss}
        novel={novel}
        destinationUri="content://exports"
      />,
    );
    view.rerender(
      <ExportEpubLogsModal
        visible
        onDismiss={onDismiss}
        novel={novel}
        destinationUri="content://exports"
      />,
    );
    await waitFor(() =>
      expect(mockGetNovelDownloadedChapters).toHaveBeenCalledTimes(2),
    );
  });

  it('saves once and does not restart when closing after success', async () => {
    mockGetNovelDownloadedChapters.mockResolvedValue(chapters);
    const onDismiss = jest.fn();
    render(
      <ExportEpubLogsModal
        visible
        onDismiss={onDismiss}
        novel={novel}
        destinationUri="content://exports"
      />,
    );

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockTaskLogDialogProps?.running).toBe(false));

    act(() => {
      mockTaskLogDialogProps?.onDismiss();
    });

    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('cancels and discards work when unmounted before chapter processing', async () => {
    let resolvePrepare: (() => void) | undefined;
    mockPrepare.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolvePrepare = resolve;
        }),
    );
    mockGetNovelDownloadedChapters.mockResolvedValue(chapters);
    const view = render(
      <ExportEpubLogsModal
        visible
        onDismiss={jest.fn()}
        novel={novel}
        destinationUri="content://exports"
      />,
    );

    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => {
      resolvePrepare?.();
    });

    await waitFor(() => expect(mockDiscardChanges).toHaveBeenCalledTimes(1));
    expect(mockSave).not.toHaveBeenCalled();
  });
});
