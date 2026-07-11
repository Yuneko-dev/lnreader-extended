import { IconButtonV2 } from '@components';
import { PluginItem } from '@plugins/types';
import { ThemeColors } from '@theme/types';
import React, { memo, useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface PluginListItemSkeletonProps {
  item: PluginItem;
  theme: ThemeColors;
}

export const PluginListItemSkeleton = memo(
  ({ item, theme }: PluginListItemSkeletonProps) => {
    const containerStyle = useMemo(
      () => [styles.container, { backgroundColor: theme.surface }],
      [theme.surface],
    );
    const iconStyle = useMemo(
      () => [styles.icon, { backgroundColor: theme.surface }],
      [theme.surface],
    );
    const nameStyle = useMemo(
      () => [{ color: theme.onSurface }, styles.name],
      [theme.onSurface],
    );
    const additionStyle = useMemo(
      () => [{ color: theme.onSurfaceVariant }, styles.addition],
      [theme.onSurfaceVariant],
    );

    const CogButton = useCallback(
      () => (
        <IconButtonV2
          name="cog-outline"
          size={22}
          color={theme.primary}
          theme={theme}
        />
      ),
      [theme],
    );

    const DownloadButton = useCallback(
      () => (
        <IconButtonV2
          name="download-outline"
          size={22}
          color={theme.primary}
          theme={theme}
        />
      ),
      [theme],
    );

    return (
      <Pressable
        style={containerStyle}
        android_ripple={{ color: theme.rippleColor }}
      >
        <View style={[styles.center, styles.row]}>
          <Image source={{ uri: item.iconUrl }} style={iconStyle} />
          <View style={styles.details}>
            <Text numberOfLines={1} style={nameStyle}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={additionStyle}>
              {`${item.lang} - ${item.version}`}
            </Text>
          </View>
        </View>
        <View style={styles.flex} />
        {item.hasSettings ? <CogButton /> : null}
        {item.hasUpdate || __DEV__ ? <DownloadButton /> : null}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  addition: {
    fontSize: 12,
    lineHeight: 20,
  },
  center: { alignItems: 'center' },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  details: {
    marginStart: 16,
  },
  flex: { flex: 1 },
  icon: {
    borderRadius: 4,
    height: 40,
    width: 40,
  },
  name: {
    fontWeight: '500',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
  },
});
