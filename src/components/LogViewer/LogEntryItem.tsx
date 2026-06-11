import { ThemeColors } from '@theme/types';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface BaseLogEntry {
  id: string;
  timestamp: string | Date;
  level?: LogLevel;
  message: string;
}

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

interface LogEntryItemProps {
  item: BaseLogEntry;
  theme: ThemeColors;
}

const LogEntryItem = ({ item, theme }: LogEntryItemProps) => {
  const timeString =
    item.timestamp instanceof Date
      ? item.timestamp.toLocaleTimeString()
      : item.timestamp;

  const levelColor = item.level ? LEVEL_COLORS[item.level] : theme.onSurface;
  const levelLabel = item.level ? LEVEL_LABELS[item.level] : null;

  return (
    <View style={styles.logEntry}>
      <Text style={[styles.logTimestamp, { color: theme.onSurfaceVariant }]}>
        {timeString}
      </Text>
      {levelLabel && (
        <Text style={[styles.logLevel, { color: levelColor }]}>
          {levelLabel}
        </Text>
      )}
      <Text
        style={[styles.logMessage, { color: theme.onSurface }]}
        selectable
        numberOfLines={10}
      >
        {item.message}
      </Text>
    </View>
  );
};

export default memo(LogEntryItem);

const styles = StyleSheet.create({
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  logTimestamp: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginRight: 8,
    width: 70,
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
});
