import { Button, ColorPreferenceItem, List } from '@components';
import ColorPickerModal from '@components/ColorPickerModal/ColorPickerModal';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useBoolean } from '@hooks';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { presetReaderThemes } from '@utils/constants/readerConstants';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import ReaderThemeSelector from '../components/ReaderThemeSelector';

const ThemeTab = () => {
  const theme = useTheme();
  const settings = useChapterReaderSettings();
  const backgroundPicker = useBoolean();
  const textPicker = useBoolean();
  const custom = settings.customThemes.some(
    item =>
      item.backgroundColor === settings.theme &&
      item.textColor === settings.textColor,
  );
  const preset = presetReaderThemes.some(
    item =>
      item.backgroundColor === settings.theme &&
      item.textColor === settings.textColor,
  );
  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <List.SubHeader theme={theme}>
          {getString('readerSettings.preset')}
        </List.SubHeader>
        <ReaderThemeSelector />
        <List.SubHeader theme={theme}>
          {getString('readerSettings.customColors')}
        </List.SubHeader>
        <ColorPreferenceItem
          description={settings.theme}
          label={getString('readerSettings.backgroundColor')}
          onPress={backgroundPicker.setTrue}
          theme={theme}
        />
        <ColorPreferenceItem
          description={settings.textColor}
          label={getString('readerSettings.textColor')}
          onPress={textPicker.setTrue}
          theme={theme}
        />
        {custom || !preset ? (
          <View style={styles.button}>
            <Button
              mode="outlined"
              onPress={() =>
                custom
                  ? settings.deleteCustomReaderTheme({
                      backgroundColor: settings.theme,
                      textColor: settings.textColor,
                    })
                  : settings.saveCustomReaderTheme({
                      backgroundColor: settings.theme,
                      textColor: settings.textColor,
                    })
              }
              title={getString(
                custom
                  ? 'readerSettings.deleteCustomTheme'
                  : 'readerSettings.saveCustomTheme',
              )}
            />
          </View>
        ) : null}
      </BottomSheetScrollView>
      <ColorPickerModal
        closeModal={backgroundPicker.setFalse}
        color={settings.theme}
        onSubmit={value => settings.setChapterReaderSettings({ theme: value })}
        title={getString('readerSettings.backgroundColor')}
        visible={backgroundPicker.value}
      />
      <ColorPickerModal
        closeModal={textPicker.setFalse}
        color={settings.textColor}
        onSubmit={value =>
          settings.setChapterReaderSettings({ textColor: value })
        }
        title={getString('readerSettings.textColor')}
        visible={textPicker.value}
      />
    </>
  );
};

export default ThemeTab;

const styles = StyleSheet.create({
  button: { marginHorizontal: 16, marginVertical: 8 },
  content: { paddingBottom: 24 },
});
