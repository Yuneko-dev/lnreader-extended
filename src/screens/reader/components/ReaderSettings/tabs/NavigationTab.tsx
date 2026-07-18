import { Button, List, StableTextInput, SwitchItem } from '@components';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useChapterGeneralSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

const NavigationTab = () => {
  const theme = useTheme();
  const settings = useChapterGeneralSettings();
  const { height } = useWindowDimensions();
  const toggle = (
    key:
      | 'useVolumeButtons'
      | 'verticalSeekbar'
      | 'swipeGestures'
      | 'tapToScroll'
      | 'pageReader'
      | 'einkRefreshOnPageTurn'
      | 'autoScroll',
  ) => settings.setChapterGeneralSettings({ [key]: !settings[key] });
  const input = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
  ) => (
    <View style={styles.inputContainer}>
      <StableTextInput
        keyboardType="numeric"
        label={label}
        mode="outlined"
        onChangeText={onChangeText}
        render={props => (
          <BottomSheetTextInput
            {...(props as React.ComponentProps<typeof BottomSheetTextInput>)}
          />
        )}
        style={styles.input}
        theme={{ colors: { ...theme } }}
        value={value}
      />
    </View>
  );

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <List.SubHeader theme={theme}>
        {getString('readerSettings.navigationControls')}
      </List.SubHeader>
      <SwitchItem
        label={getString('readerScreen.bottomSheet.volumeButtonsScroll')}
        onPress={() => toggle('useVolumeButtons')}
        theme={theme}
        value={settings.useVolumeButtons}
      />
      {settings.useVolumeButtons
        ? input(
            getString('readerSettings.volumeButtonOffset'),
            String((settings.volumeButtonsOffset ?? height * 0.75) / height),
            text => {
              const value = Number(text);
              if (Number.isFinite(value)) {
                settings.setChapterGeneralSettings({
                  volumeButtonsOffset: Math.round(value * height),
                });
              }
            },
          )
        : null}
      <SwitchItem
        description={getString('readerSettings.verticalSeekbarDesc')}
        label={getString('readerScreen.bottomSheet.verticalSeekbar')}
        onPress={() => toggle('verticalSeekbar')}
        theme={theme}
        value={settings.verticalSeekbar}
      />
      <SwitchItem
        label={getString('readerScreen.bottomSheet.swipeGestures')}
        onPress={() => toggle('swipeGestures')}
        theme={theme}
        value={settings.swipeGestures}
      />
      <SwitchItem
        label={getString('readerScreen.bottomSheet.tapToScroll')}
        onPress={() => toggle('tapToScroll')}
        theme={theme}
        value={settings.tapToScroll}
      />
      <List.SubHeader theme={theme}>
        {getString('readerSettings.readingMode')}
      </List.SubHeader>
      <SwitchItem
        label={getString('readerScreen.bottomSheet.pageReader')}
        onPress={() => toggle('pageReader')}
        theme={theme}
        value={settings.pageReader}
      />
      {settings.pageReader ? (
        <SwitchItem
          description={getString('readerSettings.einkRefreshOnPageTurnDesc')}
          label={getString('readerSettings.einkRefreshOnPageTurn')}
          onPress={() => toggle('einkRefreshOnPageTurn')}
          theme={theme}
          value={settings.einkRefreshOnPageTurn}
        />
      ) : null}
      <List.SubHeader theme={theme}>
        {getString('readerScreen.bottomSheet.autoscroll')}
      </List.SubHeader>
      <SwitchItem
        label={getString('readerScreen.bottomSheet.autoscroll')}
        onPress={() => toggle('autoScroll')}
        theme={theme}
        value={settings.autoScroll}
      />
      {settings.autoScroll ? (
        <>
          {input(
            getString('readerSettings.autoScrollInterval'),
            String(settings.autoScrollInterval),
            text => {
              const value = Number(text);
              if (Number.isFinite(value)) {
                settings.setChapterGeneralSettings({
                  autoScrollInterval: value,
                });
              }
            },
          )}
          {input(
            getString('readerSettings.autoScrollOffset'),
            String(settings.autoScrollOffset ?? height),
            text => {
              const value = Number(text);
              if (Number.isFinite(value)) {
                settings.setChapterGeneralSettings({ autoScrollOffset: value });
              }
            },
          )}
          {settings.autoScrollInterval !== 10 ||
          settings.autoScrollOffset !== null ? (
            <View style={styles.button}>
              <Button
                mode="outlined"
                onPress={() =>
                  settings.setChapterGeneralSettings({
                    autoScrollInterval: 10,
                    autoScrollOffset: null,
                  })
                }
                title={getString('common.reset')}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </BottomSheetScrollView>
  );
};

export default NavigationTab;

const styles = StyleSheet.create({
  button: { marginHorizontal: 16, marginVertical: 8 },
  content: { paddingBottom: 24 },
  input: { fontSize: 14 },
  inputContainer: { paddingHorizontal: 16, paddingVertical: 8 },
});
