import type { LogEntry } from '@services/DebugLogService';
import { act, render, waitFor } from '@testing-library/react-native';
import type { ThemeColors } from '@theme/types';
import React from 'react';
import { View } from 'react-native';

import BackupLogModal, { BACKUP_LOG_TAG } from '../BackupLogModal';

const mockSubscribe = jest.fn();
const mockGetNextId = jest.fn(() => 10);
let mockLogSubscriber: ((entries: LogEntry[]) => void) | undefined;
let mockTaskLogDialogProps: { logs: LogEntry[] } | undefined;

jest.mock('@components', () => {
  const ReactModule = jest.requireActual('react');
  const { Text, View: NativeView } = jest.requireActual('react-native');

  return {
    Button: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(Text, null, children),
    TaskLogDialog: (props: { logs: LogEntry[] }) => {
      mockTaskLogDialogProps = props;
      return ReactModule.createElement(NativeView);
    },
  };
});

jest.mock('@services/DebugLogService', () => ({
  __esModule: true,
  default: {
    addEntry: jest.fn(),
    getNextId: () => mockGetNextId(),
    subscribe: (callback: (entries: LogEntry[]) => void) => {
      mockLogSubscriber = callback;
      return mockSubscribe();
    },
  },
}));
jest.mock('@services/ServiceManager', () => ({
  __esModule: true,
  default: {
    manager: {
      STORE_KEY: 'APP_SERVICE',
      removeTasksByName: jest.fn(),
    },
  },
}));
jest.mock('react-native-mmkv', () => ({
  useMMKVObject: () => [[{ task: { name: 'LOCAL_BACKUP' } }]],
}));
jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));
jest.mock('@utils/showToast', () => ({ showToast: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

describe('BackupLogModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogSubscriber = undefined;
    mockTaskLogDialogProps = undefined;
    mockSubscribe.mockReturnValue(jest.fn());
  });

  it('filters the current session and unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(unsubscribe);
    const theme = {
      error: '#ba1a1a',
      primary: '#6750a4',
    } as ThemeColors;
    const view = render(
      <View>
        <BackupLogModal theme={theme} />
      </View>,
    );

    await waitFor(() =>
      expect(mockLogSubscriber).toEqual(expect.any(Function)),
    );

    act(() => {
      mockLogSubscriber?.([
        {
          id: 'old',
          index: 9,
          level: 'info',
          message: `${BACKUP_LOG_TAG} old`,
          timestamp: new Date(),
        },
        {
          id: 'other',
          index: 10,
          level: 'info',
          message: 'Other log',
          timestamp: new Date(),
        },
        {
          id: 'current',
          index: 11,
          level: 'info',
          message: `${BACKUP_LOG_TAG} current`,
          timestamp: new Date(),
        },
      ]);
    });

    expect(mockTaskLogDialogProps?.logs).toHaveLength(1);
    expect(mockTaskLogDialogProps?.logs[0].message).toBe('current');

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
