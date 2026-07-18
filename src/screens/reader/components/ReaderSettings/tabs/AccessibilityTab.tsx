import { List, SwitchItem } from '@components';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useChapterGeneralSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const AccessibilityTab = () => {
  const theme = useTheme();
  const settings = useChapterGeneralSettings();
  const toggle = (
    key:
      | 'fullScreenMode'
      | 'showScrollPercentage'
      | 'showBatteryAndTime'
      | 'keepScreenOn'
      | 'bionicReading'
      | 'removeExtraParagraphSpacing',
  ) => settings.setChapterGeneralSettings({ [key]: !settings[key] });

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <List.SubHeader theme={theme}>
        {getString('common.display')}
      </List.SubHeader>
      <SwitchItem
        label={getString('readerScreen.bottomSheet.fullscreen')}
        value={settings.fullScreenMode}
        onPress={() => toggle('fullScreenMode')}
        theme={theme}
      />
      <SwitchItem
        label={getString('readerScreen.bottomSheet.showProgressPercentage')}
        value={settings.showScrollPercentage}
        onPress={() => toggle('showScrollPercentage')}
        theme={theme}
      />
      <SwitchItem
        label={getString('readerScreen.bottomSheet.showBatteryAndTime')}
        value={settings.showBatteryAndTime}
        onPress={() => toggle('showBatteryAndTime')}
        theme={theme}
      />
      <SwitchItem
        label={getString('readerScreen.bottomSheet.keepScreenOn')}
        value={settings.keepScreenOn}
        onPress={() => toggle('keepScreenOn')}
        theme={theme}
      />
      <View style={styles.section}>
        <List.SubHeader theme={theme}>
          {getString('readerSettings.readingEnhancements')}
        </List.SubHeader>
        <SwitchItem
          label={getString('readerScreen.bottomSheet.bionicReading')}
          value={settings.bionicReading}
          onPress={() => toggle('bionicReading')}
          theme={theme}
        />
        <SwitchItem
          label={getString('readerScreen.bottomSheet.removeExtraSpacing')}
          value={settings.removeExtraParagraphSpacing}
          onPress={() => toggle('removeExtraParagraphSpacing')}
          theme={theme}
        />
      </View>
    </BottomSheetScrollView>
  );
};

export default AccessibilityTab;

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  section: { marginTop: 8 },
});
