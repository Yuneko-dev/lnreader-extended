import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ReaderSettingsTabBar, {
  type ReaderSettingsTab,
  type ReaderSettingsTabId,
} from './ReaderSettingsTabBar';
import AccessibilityTab from './tabs/AccessibilityTab';
import AdvancedTab from './tabs/AdvancedTab';
import DisplayTab from './tabs/DisplayTab';
import NavigationTab from './tabs/NavigationTab';
import ThemeTab from './tabs/ThemeTab';
import TTSTab from './tabs/TTSTab';

const ReaderSettingsPanel = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<ReaderSettingsTabId>('display');
  const tabs: ReaderSettingsTab[] = [
    {
      id: 'display',
      icon: 'format-size',
      label: getString('readerSettings.tabs.display'),
    },
    {
      id: 'theme',
      icon: 'palette-outline',
      label: getString('readerSettings.tabs.theme'),
    },
    {
      id: 'navigation',
      icon: 'gesture-swipe-horizontal',
      label: getString('readerSettings.tabs.navigation'),
    },
    {
      id: 'accessibility',
      icon: 'human',
      label: getString('readerSettings.tabs.accessibility'),
    },
    {
      id: 'tts',
      icon: 'account-voice',
      label: getString('readerSettings.tabs.tts'),
    },
    {
      id: 'advanced',
      icon: 'code-tags',
      label: getString('readerSettings.tabs.advanced'),
    },
  ];

  const content = {
    accessibility: <AccessibilityTab />,
    advanced: <AdvancedTab />,
    display: <DisplayTab />,
    navigation: <NavigationTab />,
    theme: <ThemeTab />,
    tts: <TTSTab />,
  }[activeTab];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ReaderSettingsTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        theme={theme}
      />
      <View style={styles.content}>{content}</View>
    </View>
  );
};

export default React.memo(ReaderSettingsPanel);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
