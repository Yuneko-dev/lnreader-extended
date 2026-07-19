import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import type { ThemeColors } from '@theme/types';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export type ReaderSettingsTabId =
  | 'display'
  | 'theme'
  | 'navigation'
  | 'accessibility'
  | 'tts'
  | 'advanced';

export type ReaderSettingsTab = {
  id: ReaderSettingsTabId;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
};

type Props = {
  activeTab: ReaderSettingsTabId;
  onTabChange: (tab: ReaderSettingsTabId) => void;
  tabs: ReaderSettingsTab[];
  theme: ThemeColors;
};

const ReaderSettingsTabBar = ({
  activeTab,
  onTabChange,
  tabs,
  theme,
}: Props) => {
  const activeIndicatorStyle = { borderBottomColor: theme.primary };
  const inactiveIndicatorStyle = { borderBottomColor: 'transparent' };
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, { borderBottomColor: theme.outlineVariant }]}
    >
      {tabs.map(tab => {
        const selected = tab.id === activeTab;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            android_ripple={{ color: theme.rippleColor }}
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={[
              styles.tab,
              selected ? activeIndicatorStyle : inactiveIndicatorStyle,
            ]}
          >
            <MaterialCommunityIcons
              color={selected ? theme.primary : theme.onSurfaceVariant}
              name={tab.icon}
              size={22}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

export default React.memo(ReaderSettingsTabBar);

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    borderBottomWidth: 3,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
  },
});
