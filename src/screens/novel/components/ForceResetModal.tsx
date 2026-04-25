import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal, Switch } from 'react-native-paper';
import { Modal } from '@components';
import { ThemeColors } from '@theme/types';
import { getString } from '@strings/translations';
import { NovelInfo } from '@database/types';
import { forceResetNovel } from '@services/updates/ForceResetNovel';
import { useNovelContext } from '../NovelContext';

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
  const [logs, setLogs] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const { refreshChapters, getNovel, setPageIndex } = useNovelContext();

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
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
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
        await getNovel();
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

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <View style={styles.logEntry}>
        <Text
          style={[styles.logMessage, { color: theme.onSurface }]}
          selectable
        >
          {item}
        </Text>
      </View>
    ),
    [theme],
  );

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
          <FlatList
            ref={flatListRef}
            data={logs}
            keyExtractor={(item, index) => String(index)}
            renderItem={renderItem}
            style={[styles.list, { backgroundColor: '#0D1117' }]}
            contentContainerStyle={styles.listContent}
            initialNumToRender={30}
          />
        ) : (
          <View>
            <Text style={[{ color: theme.onSurfaceVariant, marginBottom: 16 }]}>
              {getString('novelScreen.forceResetModal.description')}
            </Text>

            <View style={styles.row}>
              <Text style={[{ color: theme.onSurface, flex: 1 }]}>
                {getString('novelScreen.forceResetModal.reloadMetadata')}
              </Text>
              <Switch
                value={reloadMetadata}
                onValueChange={setReloadMetadata}
                color={theme.primary}
              />
            </View>

            <View style={styles.row}>
              <Text style={[{ color: theme.onSurface, flex: 1 }]}>
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
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: theme.onSurface }]}>
                    ╰─ {getString('novelScreen.forceResetModal.reloadAllPages', {
                      totalPages: novel.totalPages,
                    })}
                  </Text>
                  <Text
                    style={[{ color: theme.error, fontSize: 12, marginTop: 4 }]}
                  >
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
                <Text style={[{ color: theme.onSurface, flex: 1 }]}>
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
                style={[
                  styles.footerBtn,
                  { borderColor: theme.primary, marginRight: 8 },
                ]}
                onPress={handleStart}
                disabled={!reloadMetadata && !reloadChapters}
              >
                <Text style={{ color: theme.primary, fontSize: 13 }}>
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
                  opacity: isResetting ? 0.4 : 1,
                },
              ]}
              onPress={handleDismiss}
              disabled={isResetting}
            >
              <Text
                style={{
                  color: isResetting ? theme.onSurfaceVariant : theme.onSurface,
                  fontSize: 13,
                }}
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
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  logMessage: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
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
  footerRight: {
    flexDirection: 'row',
  },
});
