import { LogViewer, Modal } from '@components';
import DebugLogService, { LogEntry } from '@services/DebugLogService';
import ServiceManager, {
  type QueuedBackgroundTask,
} from '@services/ServiceManager';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { showToast } from '@utils/showToast';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMMKVObject } from 'react-native-mmkv';
import { Button, Portal } from 'react-native-paper';

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
      const filtered = newEntries
        .filter(
          e => e.index >= sessionStart && e.message.startsWith(BACKUP_LOG_TAG),
        )
        .map(e => ({
          ...e,
          message: e.message.replace(BACKUP_LOG_TAG + ' ', ''),
        }));
      setEntries(filtered);
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

        <LogViewer
          logs={entries}
          theme={theme}
          style={{ backgroundColor: theme.surfaceVariant, ...styles.list }}
          contentContainerStyle={styles.listContent}
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

  runningText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
