import { LegendList } from '@legendapp/list';
import { render, screen } from '@testing-library/react-native';
import type { ThemeColors } from '@theme/types';
import React from 'react';
import { Text } from 'react-native';

import LogEntryItem from '../LogEntryItem';
import LogViewer from '../LogViewer';

const theme = {
  onSurface: '#111111',
  onSurfaceVariant: '#333333',
} as ThemeColors;

describe('LogViewer', () => {
  it('uses list-managed auto-scroll without bottom-aligning short logs', () => {
    const { UNSAFE_getByType } = render(<LogViewer logs={[]} theme={theme} />);

    const list = UNSAFE_getByType(LegendList);
    expect(list.props.recycleItems).toBe(true);
    expect(list.props.maintainScrollAtEnd).toBe(true);
    expect(list.props.maintainScrollAtEndThreshold).toBe(0.1);
    expect(list.props.alignItemsAtEnd).toBeUndefined();
  });

  it('passes only the latest 1000 entries to the list', () => {
    const logs = Array.from({ length: 1005 }, (_, index) => ({
      id: `${index}`,
      message: `entry-${index}`,
      timestamp: new Date(2026, 0, 1),
      level: 'info' as const,
    }));
    const { UNSAFE_getByType } = render(
      <LogViewer logs={logs} theme={theme} />,
    );

    const list = UNSAFE_getByType(LegendList);
    expect(list.props.data).toHaveLength(1000);
    expect(list.props.data[0].message).toBe('entry-5');
  });

  it('renders timestamps, levels, messages, and the empty state', () => {
    render(
      <LogEntryItem
        item={{
          id: '1',
          message: 'Something happened',
          timestamp: '12:34:56',
          level: 'warn',
        }}
        theme={theme}
      />,
    );

    expect(screen.getByText('12:34:56')).toBeTruthy();
    expect(screen.getByText('WRN')).toBeTruthy();
    expect(screen.getByText('Something happened')).toBeTruthy();

    render(
      <LogViewer
        logs={[]}
        theme={theme}
        ListEmptyComponent={<Text>No logs</Text>}
      />,
    );
    expect(screen.getByText('No logs')).toBeTruthy();
  });
});
