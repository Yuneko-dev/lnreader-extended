import { Button, TaskLogDialog } from '@components';
import { NovelInfo } from '@database/types';
import { useBufferedLogs } from '@hooks';
import { forceResetNovel } from '@services/updates/ForceResetNovel';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';

import { useNovelActions } from '../NovelContext';

interface ForceResetModalProps {
  visible: boolean;
  onDismiss: () => void;
  novel: NovelInfo;
  theme: ThemeColors;
}

export default function ForceResetModal({
  visible,
  onDismiss,
  novel,
  theme,
}: ForceResetModalProps) {
  const [reloadMetadata, setReloadMetadata] = useState(true);
  const [reloadChapters, setReloadChapters] = useState(true);
  const [reloadAllPages, setReloadAllPages] = useState(false);
  const [deleteDownloads, setDeleteDownloads] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const isResettingRef = useRef(false);
  const { logs, addLog, clearLogs, flushLogs } = useBufferedLogs();

  const { refreshChapters, refreshNovel, setPageIndex } = useNovelActions();
  const isPagePlugin = (novel.totalPages ?? 0) > 1;

  const handleDismiss = useCallback(() => {
    if (!isResetting) {
      clearLogs();
      onDismiss();
    }
  }, [clearLogs, isResetting, onDismiss]);

  const handleStart = async () => {
    if (isResettingRef.current) {
      return;
    }

    isResettingRef.current = true;
    setIsResetting(true);
    clearLogs();
    addLog(getString('novelScreen.forceResetModal.logStart'));

    try {
      await forceResetNovel(
        novel.id,
        novel.pluginId,
        novel.path,
        {
          reloadMetadata,
          reloadChapters,
          reloadAllPages,
          deleteDownloads,
        },
        addLog,
      );
      addLog(getString('novelScreen.forceResetModal.logSuccess'));

      if (reloadMetadata) {
        await refreshNovel();
      }
      if (reloadChapters) {
        setPageIndex(0);
        refreshChapters();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`${getString('common.error') ?? 'Error'}: ${message}`);
    } finally {
      flushLogs();
      isResettingRef.current = false;
      setIsResetting(false);
    }
  };

  const idleContent = (
    <View>
      <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
        {getString('novelScreen.forceResetModal.description')}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.rowText, { color: theme.onSurface }]}>
          {getString('novelScreen.forceResetModal.reloadMetadata')}
        </Text>
        <Switch
          value={reloadMetadata}
          onValueChange={setReloadMetadata}
          color={theme.primary}
        />
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowText, { color: theme.onSurface }]}>
          {getString('novelScreen.forceResetModal.reloadChapters')}
        </Text>
        <Switch
          value={reloadChapters}
          onValueChange={setReloadChapters}
          color={theme.primary}
        />
      </View>

      {reloadChapters && isPagePlugin ? (
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={{ color: theme.onSurface }}>
              ╰─{' '}
              {getString('novelScreen.forceResetModal.reloadAllPages', {
                totalPages: novel.totalPages,
              })}
            </Text>
            <Text style={[styles.warningText, { color: theme.error }]}>
              {getString('novelScreen.forceResetModal.reloadAllPagesWarning')}
            </Text>
          </View>
          <Switch
            value={reloadAllPages}
            onValueChange={setReloadAllPages}
            color={theme.primary}
          />
        </View>
      ) : null}

      {reloadChapters ? (
        <View style={styles.row}>
          <Text style={[styles.rowText, { color: theme.onSurface }]}>
            ╰─ {getString('novelScreen.forceResetModal.deleteDownloads')}
          </Text>
          <Switch
            value={deleteDownloads}
            onValueChange={setDeleteDownloads}
            color={theme.primary}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <TaskLogDialog
      visible={visible}
      title={getString('novelScreen.forceResetModal.title')}
      running={isResetting}
      logs={logs}
      idleContent={idleContent}
      onDismiss={handleDismiss}
      actions={
        <View style={styles.actions}>
          {!isResetting && logs.length === 0 ? (
            <Button
              mode="text"
              onPress={handleStart}
              disabled={!reloadMetadata && !reloadChapters}
            >
              {getString('novelScreen.forceResetModal.start')}
            </Button>
          ) : null}
          <Button
            mode="contained-tonal"
            onPress={handleDismiss}
            disabled={isResetting}
          >
            {getString(logs.length > 0 ? 'common.ok' : 'common.cancel')}
          </Button>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  description: {
    marginBottom: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
  },
  warningText: {
    fontSize: 12,
    marginTop: 4,
  },
});
