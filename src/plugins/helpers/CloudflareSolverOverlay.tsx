import { useAppSettings, useTheme } from '@hooks/persisted';
import { getUserAgent } from '@hooks/persisted/useUserAgent';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  IconButton,
  Surface,
  Text,
} from 'react-native-paper';
import { WebView } from 'react-native-webview';

import { solveCloudflare, solveCloudflareTurnstile } from './cloudflareCDP';
import { useCloudflareStore } from './cloudflareStore';

export const CloudflareSolverOverlay = () => {
  const { tasks, completeTask } = useCloudflareStore();
  const task = tasks[0];
  const theme = useTheme();
  const { hideCloudflareOverlay } = useAppSettings();

  useEffect(() => {
    if (task) {
      let isCancelled = false;
      const abortController = new AbortController();

      if (task.type === 'solve-turnstile' && task.sitekey) {
        solveCloudflareTurnstile(task.url, task.sitekey, abortController.signal)
          .then(result => {
            if (!isCancelled) completeTask(task.id, result);
          })
          .catch(err => {
            // eslint-disable-next-line no-console
            console.error('[CloudflareSolverOverlay] Error:', err);
            if (!isCancelled) completeTask(task.id, '');
          });
      } else {
        solveCloudflare(
          task.url,
          task.type as 'interstitial' | 'turnstile',
          abortController.signal,
        )
          .then(result => {
            if (!isCancelled) completeTask(task.id, result);
          })
          .catch(err => {
            // eslint-disable-next-line no-console
            console.error('[CloudflareSolverOverlay] Error:', err);
            if (!isCancelled) completeTask(task.id, false);
          });
      }

      return () => {
        isCancelled = true;
        abortController.abort();
      };
    }
  }, [task, completeTask]);

  if (!task) return null;

  const userAgent = getUserAgent();
  const isHidden = hideCloudflareOverlay;

  const hostname = (() => {
    try {
      return new URL(task.url).hostname;
    } catch {
      return task.url;
    }
  })();

  return (
    <View
      style={isHidden ? styles.hiddenContainer : styles.visibleContainer}
      pointerEvents={isHidden ? 'none' : 'auto'}
    >
      {!isHidden && (
        <Surface
          style={[styles.header, { backgroundColor: theme.surface }]}
          elevation={2}
        >
          <View style={styles.headerTitleContainer}>
            <ActivityIndicator
              size="small"
              style={styles.activityIndicator}
              color={theme.primary}
            />
            <View>
              <Text variant="titleMedium" style={{ color: theme.onSurface }}>
                Bypassing Cloudflare
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.onSurfaceVariant }}
              >
                {hostname}
              </Text>
            </View>
          </View>
          <IconButton
            icon="close"
            size={24}
            iconColor={theme.onSurface}
            onPress={() => completeTask(task.id, false)}
          />
        </Surface>
      )}
      <View style={[styles.webviewWrapper, { backgroundColor: theme.surface }]}>
        <WebView
          source={{ uri: task.url }}
          style={styles.webview}
          userAgent={userAgent}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          originWhitelist={[
            'http://*',
            'https://*',
            'about:*',
            'data:*',
            'blob:*',
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    zIndex: -1,
  },
  visibleContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '90%',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webviewWrapper: {
    width: '90%',
    height: 450,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  activityIndicator: {
    marginRight: 16,
  },
});
