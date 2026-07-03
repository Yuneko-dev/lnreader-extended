import { LegendList } from '@legendapp/list';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useMemo } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import LogEntryItem, { BaseLogEntry } from './LogEntryItem';

const MAX_LOG_ENTRIES = 1000;

interface LogViewerProps {
  logs: BaseLogEntry[];
  theme: ThemeColors;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ListEmptyComponent?: React.ReactElement;
}

export const LogViewer = ({
  logs,
  theme,
  style,
  contentContainerStyle,
  ListEmptyComponent,
}: LogViewerProps) => {
  const displayLogs = useMemo(
    () =>
      logs.length > MAX_LOG_ENTRIES
        ? logs.slice(logs.length - MAX_LOG_ENTRIES)
        : logs,
    [logs],
  );

  const renderItem = useCallback(
    ({ item }: { item: BaseLogEntry }) => (
      <LogEntryItem item={item} theme={theme} />
    ),
    [theme],
  );

  const keyExtractor = useCallback((item: BaseLogEntry) => item.id, []);

  return (
    <LegendList
      data={displayLogs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={[styles.list, style]}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      ListEmptyComponent={ListEmptyComponent}
      estimatedItemSize={40}
      recycleItems
      maintainScrollAtEnd
      maintainScrollAtEndThreshold={0.1}
    />
  );
};

const styles = StyleSheet.create({
  list: {},
  listContent: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
});

export default LogViewer;
