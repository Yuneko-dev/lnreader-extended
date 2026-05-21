import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Portal, Button } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';

import { Modal } from '@components';
import { ThemeColors } from '@theme/types';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import DebugLogService, { LogEntry, LogLevel } from '@services/DebugLogService';
import ServiceManager, {
  type QueuedBackgroundTask,
} from '@services/ServiceManager';
import { useMMKVObject } from 'react-native-mmkv';

const LEVEL_COLORS: Record<LogLevel, string> = {
  log: '#A0A0A0',
  info: '#58A6FF',
  warn: '#D29922',
  error: '#F85149',
};

/**
 * Tag used to filter backup-related log entries.
 */
export const BACKUP_LOG_TAG = '[Backup]';

/**
 * Backup task names.
 */
const BACKUP_TASK_NAMES = [
  'LOCAL_BACKUP',
  'DRIVE_BACKUP',
  'SELF_HOST_BACKUP',
] as const;

const RESTORE_TASK_NAMES = [
  'LOCAL_RESTORE',
  'DRIVE_RESTORE',
  'SELF_HOST_RESTORE',
] as const;

const ALL_BACKUP_RESTORE_NAMES = [...BACKUP_TASK_NAMES, ...RESTORE_TASK_NAMES];

interface BackupLogModalProps {
  theme: ThemeColors;
}

export default function BackupLogModal({ theme }: BackupLogModalProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const sessionStartIdRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  // Watch task queue to detect backup/restore tasks
  const [taskQueue] = useMMKVObject<QueuedBackgroundTask[]>(
    ServiceManager.manager.STORE_KEY,
  );

  // Determine if a backup or restore task is currently active
  const hasActiveBackupRestore = (taskQueue ?? []).some(
    t => t?.task?.name && ALL_BACKUP_RESTORE_NAMES.includes(t.task.name as any),
  );

  const hasActiveBackupOnly = (taskQueue ?? []).some(
    t =>
      t?.task?.name &&
      (BACKUP_TASK_NAMES as readonly string[]).includes(t.task.name),
  );

  // Auto-open when a backup/restore task starts
  useEffect(() => {
    if (hasActiveBackupRestore && !visible) {
      // Clear previous session entries and start new session
      sessionStartIdRef.current = DebugLogService.getNextId();
      setEntries([]);
      setVisible(true);
    }
  }, [hasActiveBackupRestore, visible]);

  // Subscribe to log updates while visible
  useEffect(() => {
    if (!visible) {
      return;
    }

    const unsubscribe = DebugLogService.subscribe(newEntries => {
      const sessionStart = sessionStartIdRef.current ?? 0;
      const filtered = newEntries.filter(
        e => e.id >= sessionStart && e.message.startsWith(BACKUP_LOG_TAG),
      );
      setEntries(filtered);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return unsubscribe;
  }, [visible]);

  const closeModal = useCallback(() => {
    // Only allow closing when no backup/restore task is running
    if (!hasActiveBackupRestore) {
      setVisible(false);
    }
  }, [hasActiveBackupRestore]);

  const copyLog = useCallback(() => {
    const text = entries
      .map(e => `[${e.timestamp.toLocaleTimeString()}] ${e.message}`)
      .join('\n');
    Clipboard.setStringAsync(text);
    showToast(getString('common.copiedToClipboard', { name: 'Backup Log' }));
  }, [entries]);

  const cancelBackup = useCallback(() => {
    ServiceManager.manager.removeTasksByName('LOCAL_BACKUP');
    ServiceManager.manager.removeTasksByName('DRIVE_BACKUP');
    ServiceManager.manager.removeTasksByName('SELF_HOST_BACKUP');
    DebugLogService.addEntry(
      'warn',
      `${BACKUP_LOG_TAG} Backup cancelled by user`,
    );
    showToast(getString('backupLogScreen.backupCancelled'));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LogEntry }) => (
      <View style={styles.logEntry}>
        <Text style={[styles.logTimestamp, { color: theme.onSurfaceVariant }]}>
          {item.timestamp.toLocaleTimeString()}
        </Text>
        <Text
          style={[
            styles.logMessage,
            { color: LEVEL_COLORS[item.level] || theme.onSurface },
          ]}
          selectable
        >
          {item.message.replace(BACKUP_LOG_TAG + ' ', '')}
        </Text>
      </View>
    ),
    [theme],
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={closeModal}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.onSurface }]}>
            {getString('backupLogScreen.title')}
          </Text>
          {hasActiveBackupRestore && (
            <Text style={[styles.runningText, { color: theme.primary }]}>
              ● {getString('common.loading')}
            </Text>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={entries}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          style={[styles.list, { backgroundColor: theme.surfaceVariant }]}
          contentContainerStyle={styles.listContent}
          initialNumToRender={30}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
              {getString('backupLogScreen.noLogs')}
            </Text>
          }
        />

        <View style={styles.footer}>
          {hasActiveBackupOnly ? (
            <Button
              mode="outlined"
              textColor={theme.error}
              onPress={cancelBackup}
            >
              {getString('backupLogScreen.cancelBackup')}
            </Button>
          ) : (
            <View />
          )}
          <View style={styles.footerRight}>
            <Button mode="text" textColor={theme.primary} onPress={copyLog}>
              {getString('debugLogScreen.copyAll')}
            </Button>
            <Button
              mode="contained-tonal"
              onPress={closeModal}
              disabled={hasActiveBackupRestore}
            >
              {getString('common.ok')}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    padding: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  list: {
    borderRadius: 8,
    maxHeight: 350,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 3,
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
  runningText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
