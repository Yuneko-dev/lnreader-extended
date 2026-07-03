import { useTheme } from '@hooks/persisted';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, Portal, Text } from 'react-native-paper';

import { BaseLogEntry, LogViewer } from '../LogViewer';

interface TaskLogDialogProps {
  visible: boolean;
  title: string;
  running: boolean;
  logs: BaseLogEntry[];
  onDismiss: () => void;
  description?: string;
  idleContent?: React.ReactNode;
  emptyMessage?: string;
  actions: React.ReactNode;
}

export const TaskLogDialog = ({
  visible,
  title,
  running,
  logs,
  onDismiss,
  description,
  idleContent,
  emptyMessage,
  actions,
}: TaskLogDialogProps) => {
  const theme = useTheme();
  const showLogs = running || logs.length > 0 || !idleContent;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        dismissable={!running}
        dismissableBackButton={!running}
        style={[
          styles.dialog,
          { backgroundColor: theme.overlay3 ?? theme.surface },
        ]}
        theme={{ colors: theme }}
      >
        <View style={styles.header}>
          <Text
            variant="titleLarge"
            style={[styles.title, { color: theme.onSurface }]}
          >
            {title}
          </Text>
          {running ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : null}
        </View>

        <Dialog.Content style={styles.content}>
          {showLogs ? (
            <>
              {description ? (
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.description,
                    { color: theme.onSurfaceVariant },
                  ]}
                >
                  {description}
                </Text>
              ) : null}
              <LogViewer
                logs={logs}
                theme={theme}
                style={[
                  styles.logViewer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
                ListEmptyComponent={
                  emptyMessage ? (
                    <Text
                      style={[
                        styles.emptyText,
                        { color: theme.onSurfaceVariant },
                      ]}
                    >
                      {emptyMessage}
                    </Text>
                  ) : undefined
                }
              />
            </>
          ) : (
            <ScrollView
              style={styles.idleScrollView}
              contentContainerStyle={styles.idleContent}
              showsVerticalScrollIndicator={false}
            >
              {idleContent}
            </ScrollView>
          )}
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>{actions}</Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexWrap: 'wrap',
    width: '100%',
  },
  content: {
    flexShrink: 1,
  },
  description: {
    marginBottom: 16,
  },
  dialog: {
    maxHeight: '90%',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  idleContent: {
    flexGrow: 1,
  },
  idleScrollView: {
    flexShrink: 1,
  },
  logViewer: {
    borderRadius: 12,
    flexShrink: 1,
    height: 350,
    minHeight: 96,
  },
  title: {
    flex: 1,
    marginRight: 16,
  },
});

export default TaskLogDialog;
