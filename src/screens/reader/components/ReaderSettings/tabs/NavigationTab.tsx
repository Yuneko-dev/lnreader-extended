import { Button, List, StableTextInput, SwitchItem } from '@components';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useChapterGeneralSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import type { ThemeColors } from '@theme/types';
import React, { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

type NumericInputProps = {
  label: string;
  theme: ThemeColors;
  value: string;
  onChangeNumber: (value: number) => void;
};

const NumericInput = ({
  label,
  theme,
  value,
  onChangeNumber,
}: NumericInputProps) => {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const focusedRef = useRef(false);
  // Adopt external changes (e.g. the reset button) without clobbering
  // in-progress typing like "0." that parses to the stored value.
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focusedRef.current && Number(text) !== Number(value)) {
      setText(value);
    }
  }

  return (
    <View style={styles.inputContainer}>
      <StableTextInput
        keyboardType="numeric"
        label={label}
        mode="outlined"
        onBlur={() => {
          focusedRef.current = false;
        }}
        onChangeText={next => {
          setText(next);
          const parsed = Number(next);
          if (next.trim() && Number.isFinite(parsed)) {
            onChangeNumber(parsed);
          }
        }}
        onFocus={() => {
          focusedRef.current = true;
        }}
        render={props => (
          <BottomSheetTextInput
            {...(props as React.ComponentProps<typeof BottomSheetTextInput>)}
          />
        )}
        style={styles.input}
        theme={{ colors: { ...theme } }}
        value={text}
      />
    </View>
  );
};

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
      {settings.useVolumeButtons ? (
        <NumericInput
          label={getString('readerSettings.volumeButtonOffset')}
          onChangeNumber={value =>
            settings.setChapterGeneralSettings({
              volumeButtonsOffset: Math.round(value * height),
            })
          }
          theme={theme}
          value={String(
            Math.round(
              ((settings.volumeButtonsOffset ?? height * 0.75) / height) * 100,
            ) / 100,
          )}
        />
      ) : null}
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
          <NumericInput
            label={getString('readerSettings.autoScrollInterval')}
            onChangeNumber={value =>
              settings.setChapterGeneralSettings({ autoScrollInterval: value })
            }
            theme={theme}
            value={String(settings.autoScrollInterval)}
          />
          <NumericInput
            label={getString('readerSettings.autoScrollOffset')}
            onChangeNumber={value =>
              settings.setChapterGeneralSettings({ autoScrollOffset: value })
            }
            theme={theme}
            value={String(settings.autoScrollOffset ?? height)}
          />
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
