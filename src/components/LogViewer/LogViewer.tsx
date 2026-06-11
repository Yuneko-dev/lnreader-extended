import { LegendList } from '@legendapp/list';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

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
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const autoScrollLockTimeout = useRef<NodeJS.Timeout | null>(null);
  const autoScrollLock = useRef<boolean>(false);

  // Truncate logs if they exceed the maximum buffer size
  const displayLogs =
    logs.length > MAX_LOG_ENTRIES
      ? logs.slice(logs.length - MAX_LOG_ENTRIES)
      : logs;

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      if (autoScrollLockTimeout.current) {
        clearTimeout(autoScrollLockTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only auto-scroll if the user is at or very close to the bottom
    if (isAtBottom.current && displayLogs.length > 0) {
      if (scrollTimeout.current) return;

      scrollTimeout.current = setTimeout(() => {
        autoScrollLock.current = true;
        listRef.current?.scrollToEnd({ animated: true });

        if (autoScrollLockTimeout.current) {
          clearTimeout(autoScrollLockTimeout.current);
        }
        autoScrollLockTimeout.current = setTimeout(() => {
          autoScrollLock.current = false;
        }, 500);

        scrollTimeout.current = null;
      }, 100);
    }
  }, [logs, displayLogs.length]);

  const onScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;

    const currentlyAtBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (autoScrollLock.current && !currentlyAtBottom) {
      return;
    }

    isAtBottom.current = currentlyAtBottom;
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
