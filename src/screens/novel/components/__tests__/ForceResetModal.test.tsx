import { NovelInfo } from '@database/types';
import { forceResetNovel } from '@services/updates/ForceResetNovel';
import { act, render } from '@testing-library/react-native';
import { ThemeColors } from '@theme/types';
import React from 'react';

import ForceResetModal from '../ForceResetModal';

let mockStartReset: (() => void) | undefined;

jest.mock('@components', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    Button: ({
      children,
      disabled,
      onPress,
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      onPress?: () => void;
    }) => {
      if (children === 'novelScreen.forceResetModal.start') {
        mockStartReset = onPress;
      }
      return ReactModule.createElement(
        Pressable,
        { disabled, onPress },
        ReactModule.createElement(Text, null, children),
      );
    },
    TaskLogDialog: ({ actions }: { actions: React.ReactNode }) =>
      ReactModule.createElement(View, null, actions),
  };
});

jest.mock('@hooks', () => ({
  useBufferedLogs: jest.requireActual('@hooks/common/useBufferedLogs').default,
}));
jest.mock('@services/updates/ForceResetNovel', () => ({
  forceResetNovel: jest.fn(),
}));
jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));
jest.mock('../../NovelContext', () => ({
  useNovelActions: () => ({
    refreshChapters: jest.fn(),
    refreshNovel: jest.fn(),
    setPageIndex: jest.fn(),
  }),
}));

const mockForceResetNovel = forceResetNovel as jest.MockedFunction<
  typeof forceResetNovel
>;

const novel = {
  id: 1,
  path: '/novel',
  pluginId: 'plugin',
  totalPages: 1,
} as NovelInfo;

const theme = {
  error: '#ba1a1a',
  onSurface: '#1a1a1a',
  onSurfaceVariant: '#444444',
  primary: '#6750a4',
} as ThemeColors;

describe('ForceResetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartReset = undefined;
  });

  it('ignores a second start while the reset is already in flight', async () => {
    let resolveReset: (() => void) | undefined;
    mockForceResetNovel.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveReset = resolve;
        }),
    );

    render(
      <ForceResetModal
        visible
        onDismiss={jest.fn()}
        novel={novel}
        theme={theme}
      />,
    );

    await act(async () => {
      mockStartReset?.();
      mockStartReset?.();
    });
    expect(mockForceResetNovel).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReset?.();
    });
  });
});
