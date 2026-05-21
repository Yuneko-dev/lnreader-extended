import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Appbar as PaperAppbar, Chip } from 'react-native-paper';

import { Appbar, SafeAreaView } from '@components';
import { useTheme } from '@hooks/persisted';
import DebugLogService, { LogEntry, LogLevel } from '@services/DebugLogService';
import { showToast } from '@utils/showToast';
import { getString } from '@strings/translations';

type FilterLevel = 'all' | LogLevel;

const LEVEL_COLORS: Record<LogLevel, string> = {
  log: '#A0A0A0',
  info: '#58A6FF',
  warn: '#D29922',
  error: '#F85149',
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  log: 'LOG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

const DebugLogScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [entries, setEntries] = useState<LogEntry[]>(
    DebugLogService.getEntries(),
  );
  const [filter, setFilter] = useState<FilterLevel>('all');
  const flatListRef = useRef<FlatList>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const unsubscribe = DebugLogService.subscribe(newEntries => {
      setEntries(newEntries);
      if (autoScrollRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 50);
      }
    });
    return unsubscribe;
  }, []);

  const filteredEntries =
    filter === 'all' ? entries : entries.filter(e => e.level === filter);

  const copyAll = useCallback(() => {
    const text = filteredEntries
      .map(
        e =>
          `[${e.timestamp.toLocaleTimeString()}] [${LEVEL_LABELS[e.level]}] ${
            e.message
          }`,
      )
      .join('\n');
    Clipboard.setStringAsync(text);
    showToast(getString('common.copiedToClipboard', { name: 'Log' }));
  }, [filteredEntries]);

  const clearLog = useCallback(() => {
    DebugLogService.clear();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LogEntry }) => (
      <View style={styles.logEntry}>
        <Text style={[styles.logTimestamp, { color: theme.onSurfaceVariant }]}>
          {item.timestamp.toLocaleTimeString()}
        </Text>
        <Text style={[styles.logLevel, { color: LEVEL_COLORS[item.level] }]}>
          {LEVEL_LABELS[item.level]}
        </Text>
        <Text
          style={[styles.logMessage, { color: theme.onSurface }]}
          selectable
          numberOfLines={10}
        >
          {item.message}
        </Text>
      </View>
    ),
    [theme],
  );

  const filterButtons: { label: string; value: FilterLevel }[] = [
    { label: 'All', value: 'all' },
    { label: 'L', value: 'log' },
    { label: 'I', value: 'info' },
    { label: 'W', value: 'warn' },
    { label: 'E', value: 'error' },
  ];

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('debugLogScreen.title')}
        handleGoBack={() => navigation.goBack()}
        theme={theme}
      >
        <PaperAppbar.Action
          icon="content-copy"
          iconColor={theme.onSurface}
          onPress={copyAll}
        />
        <PaperAppbar.Action
          icon="delete-outline"
          iconColor={theme.error}
          onPress={clearLog}
        />
      </Appbar>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterButtons.map(btn => (
            <Chip
              key={btn.value}
              mode={filter === btn.value ? 'flat' : 'outlined'}
              selected={filter === btn.value}
              showSelectedOverlay
              onPress={() => setFilter(btn.value)}
              style={styles.filterChip}
            >
              {btn.label}
            </Chip>
          ))}
        </ScrollView>
      </View>
      <FlatList
        ref={flatListRef}
        data={filteredEntries}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        style={[styles.list, { backgroundColor: theme.surfaceVariant }]}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => {
          autoScrollRef.current = false;
        }}
        onEndReached={() => {
          autoScrollRef.current = true;
        }}
        onEndReachedThreshold={0.1}
        initialNumToRender={50}
        maxToRenderPerBatch={30}
        getItemLayout={(_, index) => ({
          length: 40,
          offset: 40 * index,
          index,
        })}
      />
      <View style={[styles.statusBar, { backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>
          {filteredEntries.length} {getString('debugLogScreen.entries')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default DebugLogScreen;

const styles = StyleSheet.create({
  filterChip: {
    borderRadius: 100,
  },
  filterRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  logLevel: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
    width: 30,
  },
  logMessage: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  logTimestamp: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginRight: 8,
    width: 70,
  },
  statusBar: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toolbar: {
    paddingVertical: 12,
  },
});
