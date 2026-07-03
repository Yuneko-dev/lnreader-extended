import { Button, TaskLogDialog } from '@components';
import DebugLogService, { LogEntry } from '@services/DebugLogService';
import ServiceManager, {
  type QueuedBackgroundTask,
} from '@services/ServiceManager';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { showToast } from '@utils/showToast';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMMKVObject } from 'react-native-mmkv';

export const BACKUP_LOG_TAG = '[Backup]';

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
  const [taskQueue] = useMMKVObject<QueuedBackgroundTask[]>(
    ServiceManager.manager.STORE_KEY,
  );

  const hasActiveBackupRestore = (taskQueue ?? []).some(
    task =>
      task?.task?.name &&
      (ALL_BACKUP_RESTORE_NAMES as readonly string[]).includes(task.task.name),
  );

  const hasActiveBackupOnly = (taskQueue ?? []).some(
    task =>
      task?.task?.name &&
      (BACKUP_TASK_NAMES as readonly string[]).includes(task.task.name),
  );

  useEffect(() => {
    if (hasActiveBackupRestore && !visible) {
      sessionStartIdRef.current = DebugLogService.getNextId();
      setEntries([]);
      setVisible(true);
    }
  }, [hasActiveBackupRestore, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    return DebugLogService.subscribe(newEntries => {
      const sessionStart = sessionStartIdRef.current ?? 0;
      setEntries(
        newEntries
          .filter(
            entry =>
              entry.index >= sessionStart &&
              entry.message.startsWith(BACKUP_LOG_TAG),
          )
          .map(entry => ({
            ...entry,
            message: entry.message.replace(`${BACKUP_LOG_TAG} `, ''),
          })),
      );
    });
  }, [visible]);

  const closeModal = useCallback(() => {
    if (!hasActiveBackupRestore) {
      setVisible(false);
    }
  }, [hasActiveBackupRestore]);

  const copyLog = useCallback(() => {
    const text = entries
      .map(
        entry => `[${entry.timestamp.toLocaleTimeString()}] ${entry.message}`,
      )
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
    <TaskLogDialog
      visible={visible}
      title={getString('backupLogScreen.title')}
      running={hasActiveBackupRestore}
      logs={entries}
      emptyMessage={getString('backupLogScreen.noLogs')}
      onDismiss={closeModal}
      actions={
        <View style={styles.actions}>
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
      }
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  footerRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
