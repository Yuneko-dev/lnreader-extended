import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LegendList } from '@legendapp/list';
import { ThemeColors } from '@theme/types';
import LogEntryItem, { BaseLogEntry } from './LogEntryItem';

const MAX_LOG_ENTRIES = 1000;

interface LogViewerProps {
  logs: BaseLogEntry[];
  theme: ThemeColors;
  style?: ViewStyle | ViewStyle[];
  contentContainerStyle?: ViewStyle | ViewStyle[];
  ListEmptyComponent?: React.ReactElement;
}

export const LogViewer = ({
  logs,
  theme,
  style,
  contentContainerStyle,
  ListEmptyComponent,
}: LogViewerProps) => {
  const listRef = useRef<any>(null);
  const isAtBottom = useRef<boolean>(true);

  // Truncate logs if they exceed the maximum buffer size
  const displayLogs =
    logs.length > MAX_LOG_ENTRIES
      ? logs.slice(logs.length - MAX_LOG_ENTRIES)
      : logs;

  useEffect(() => {
    // Only auto-scroll if the user is at or very close to the bottom
    if (isAtBottom.current && displayLogs.length > 0) {
      // Use setTimeout to allow the list to render the new items first
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [displayLogs.length]);

  const onScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    isAtBottom.current =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: BaseLogEntry }) => (
      <LogEntryItem item={item} theme={theme} />
    ),
    [theme],
  );

  const keyExtractor = useCallback((item: BaseLogEntry) => item.id, []);

  return (
    <LegendList
      ref={listRef}
      data={displayLogs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={[styles.list, style]}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListEmptyComponent={ListEmptyComponent}
      estimatedItemSize={40}
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
