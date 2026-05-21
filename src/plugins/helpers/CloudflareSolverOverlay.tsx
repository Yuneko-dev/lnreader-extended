import React, { useEffect } from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCloudflareStore } from './cloudflareStore';
import { solveCloudflare } from './cloudflareCDP';
import { getUserAgent } from '@hooks/persisted/useUserAgent';

export const CloudflareSolverOverlay = () => {
  const { tasks, completeTask } = useCloudflareStore();
  const task = tasks[0];

  useEffect(() => {
    if (task) {
      let isCancelled = false;
      solveCloudflare(task.url, task.type)
        .then(result => {
          if (!isCancelled) completeTask(task.id, result);
        })
        .catch(err => {
          console.error('[CloudflareSolverOverlay] Error:', err);
          if (!isCancelled) completeTask(task.id, false);
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [task, completeTask]);

  if (!task) return null;

  const isDev = __DEV__;
  const userAgent = getUserAgent();

  return (
    <View
      style={isDev ? styles.devContainer : styles.releaseContainer}
      pointerEvents={isDev ? 'auto' : 'none'}
    >
      {isDev && (
        <View style={styles.header}>
          <Text style={styles.title}>Cloudflare Solver (DEV)</Text>
          <Button title="Close" onPress={() => completeTask(task.id, false)} />
        </View>
      )}
      <WebView
        source={{ uri: task.url }}
        style={{ flex: 1 }}
        userAgent={userAgent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  devContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: 'white',
    marginTop: 50,
  },
  releaseContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: 'black',
  },
});
