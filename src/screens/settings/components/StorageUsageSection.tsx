import React, { useEffect, useState } from 'react';
import { StyleSheet, View, InteractionManager } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import NativeFile from '@specs/NativeFile';
import SettingSwitch from './SettingSwitch';
import { List } from '@components';
import { showToast } from '@utils/showToast';

export default function StorageUsageSection() {
  const theme = useTheme();
  const { clearCacheOnExit, setAppSettings } = useAppSettings();
  const constants = NativeFile.getConstants();
  
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [freeSpace, setFreeSpace] = useState<number>(constants.FreeSpace);
  const [clearing, setClearing] = useState(false);

  const fetchStorageInfo = () => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        try {
          const cache = NativeFile.getFileSize(
            constants.ExternalCachesDirectoryPath,
          );
          setCacheSize(cache);
          
          const free = NativeFile.getFreeSpace();
          if (free > 0) {
            setFreeSpace(free);
          }
        } catch (e) {
          console.error(e);
        }
      }, 100);
    });
  };

  useEffect(() => {
    fetchStorageInfo();
  }, [clearing]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) {
      return '0 B';
    }
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const handleClearCache = () => {
    setClearing(true);
    try {
      NativeFile.unlink(constants.ExternalCachesDirectoryPath);
      NativeFile.mkdir(constants.ExternalCachesDirectoryPath);
      showToast(getString('advancedSettingsScreen.cacheCleared'));
    } catch (e) {
      console.error(e);
    }
    setClearing(false);
  };

  const usePercent =
    constants.TotalSpace > 0
      ? ((constants.TotalSpace - freeSpace) / constants.TotalSpace) * 100
      : 0;

  return (
    <View style={styles.container}>
      <List.SubHeader theme={theme}>
        {getString('advancedSettingsScreen.storageUsage')}
      </List.SubHeader>
      <View style={styles.storageInfoContainer}>
        <Text style={[styles.pathLabel, { color: theme.primary }]}>
          {constants.StoragePath}
        </Text>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: theme.surfaceVariant },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { width: `${usePercent}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </View>
        <Text style={[styles.storageText, { color: theme.onSurfaceVariant }]}>
          {getString('advancedSettingsScreen.storageAvailable', {
            available: formatBytes(freeSpace, 2),
            total: formatBytes(constants.TotalSpace, 2),
          })}
        </Text>
      </View>

      <List.Item
        title={getString('advancedSettingsScreen.cleanCache')}
        description={getString('advancedSettingsScreen.cacheUsed', {
          size: formatBytes(cacheSize, 2),
        })}
        onPress={handleClearCache}
        theme={theme}
      />

      <SettingSwitch
        label={getString('advancedSettingsScreen.clearCacheOnExit')}
        value={clearCacheOnExit}
        onPress={() => setAppSettings({ clearCacheOnExit: !clearCacheOnExit })}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  storageInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pathLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  storageText: {
    fontSize: 14,
  },
});
