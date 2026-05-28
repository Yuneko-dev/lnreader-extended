import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Appbar as PaperAppbar, Chip } from 'react-native-paper';

import { Appbar, SafeAreaView, LogViewer } from '@components';
import { useTheme } from '@hooks/persisted';
import DebugLogService, { LogEntry, LogLevel } from '@services/DebugLogService';
import { showToast } from '@utils/showToast';
import { getString } from '@strings/translations';

type FilterLevel = 'all' | LogLevel;

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

  useEffect(() => {
    const unsubscribe = DebugLogService.subscribe(newEntries => {
      setEntries(newEntries);
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
      <LogViewer
        logs={filteredEntries}
        theme={theme}
        style={{ flex: 1, backgroundColor: theme.surfaceVariant }}
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

  statusBar: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toolbar: {
    paddingVertical: 12,
  },
});
