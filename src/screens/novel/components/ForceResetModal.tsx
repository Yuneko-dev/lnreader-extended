import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal, Switch } from 'react-native-paper';
import Modal from '@components/Modal/Modal';
import { LogViewer } from '@components/LogViewer';
import { BaseLogEntry } from '@components/LogViewer';
import { ThemeColors } from '@theme/types';
import { getString } from '@strings/translations';
import { NovelInfo } from '@database/types';
import { forceResetNovel } from '@services/updates/ForceResetNovel';
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
  const [logs, setLogs] = useState<BaseLogEntry[]>([]);

  const { refreshChapters, refreshNovel, setPageIndex } = useNovelActions();

  const isPagePlugin = (novel.totalPages ?? 0) > 1;

  const handleDismiss = useCallback(() => {
    if (!isResetting) {
      onDismiss();
      // Reset form state after closing
      setTimeout(() => {
        setLogs([]);
      }, 500);
    }
  }, [isResetting, onDismiss]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .substring(2)}`,
        message: msg,
        timestamp: new Date(),
        level: 'info',
      },
    ]);
  }, []);

  const handleStart = async () => {
    setIsResetting(true);
    setLogs([]);
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
    } catch (e: any) {
      addLog(`${getString('common.error') ?? 'Error'}: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        dismissable={!isResetting}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.onSurface }]}>
            {getString('novelScreen.forceResetModal.title')}
          </Text>
          {isResetting && (
            <Text style={[styles.runningText, { color: theme.primary }]}>
              ● {getString('common.loading')}
            </Text>
          )}
        </View>

        {logs.length > 0 || isResetting ? (
          <LogViewer
            logs={logs}
            theme={theme}
            style={[styles.list, { backgroundColor: theme.surfaceVariant }]}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View>
            <Text
              style={[styles.description, { color: theme.onSurfaceVariant }]}
            >
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

            {reloadChapters && isPagePlugin && (
              <View style={[styles.row]}>
                <View style={styles.rowText}>
                  <Text style={[{ color: theme.onSurface }]}>
                    ╰─{' '}
                    {getString('novelScreen.forceResetModal.reloadAllPages', {
                      totalPages: novel.totalPages,
                    })}
                  </Text>
                  <Text style={[styles.warningText, { color: theme.error }]}>
                    {getString(
                      'novelScreen.forceResetModal.reloadAllPagesWarning',
                    )}
                  </Text>
                </View>
                <Switch
                  value={reloadAllPages}
                  onValueChange={setReloadAllPages}
                  color={theme.primary}
                />
              </View>
            )}

            {reloadChapters ? (
              <View style={[styles.row]}>
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
        )}

        <View style={styles.footer}>
          <View style={styles.footerRight}>
            {!isResetting && logs.length === 0 && (
              <Pressable
                style={[styles.footerBtn, styles.startBtn]}
                onPress={handleStart}
                disabled={!reloadMetadata && !reloadChapters}
              >
                <Text style={[styles.btnText, { color: theme.primary }]}>
                  {getString('novelScreen.forceResetModal.start')}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.footerBtn,
                {
                  borderColor: isResetting
                    ? theme.surfaceVariant
                    : theme.outline,
                },
                isResetting ? styles.opacity40 : styles.opacity100,
              ]}
              onPress={handleDismiss}
              disabled={isResetting}
            >
              <Text
                style={[
                  styles.btnText,
                  {
                    color: isResetting
                      ? theme.onSurfaceVariant
                      : theme.onSurface,
                  },
                ]}
              >
                {getString(logs.length > 0 ? 'common.ok' : 'common.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  runningText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 16,
  },
  rowText: {
    flex: 1,
  },
  warningText: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  list: {
    borderRadius: 8,
    maxHeight: 350,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  footerBtn: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startBtn: {
    marginRight: 8,
  },
  btnText: {
    fontSize: 13,
  },
  opacity40: {
    opacity: 0.4,
  },
  opacity100: {
    opacity: 1,
  },
  footerRight: {
    flexDirection: 'row',
  },
});
