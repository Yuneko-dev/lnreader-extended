import { List } from '@components';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useBoolean } from '@hooks';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { readerFonts } from '@utils/constants/readerConstants';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal } from 'react-native-paper';

import FontPickerModal from '../components/FontPickerModal';
import ReaderTextAlignSelector from '../components/ReaderTextAlignSelector';
import ReaderValueControl from '../components/ReaderValueControl';

const DisplayTab = () => {
  const theme = useTheme();
  const settings = useChapterReaderSettings();
  const fontPicker = useBoolean();
  const update = (
    values: Parameters<typeof settings.setChapterReaderSettings>[0],
  ) => settings.setChapterReaderSettings(values);
  const fontName = readerFonts.find(
    font => font.fontFamily === settings.fontFamily,
  )?.name;
  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ReaderValueControl
          label={getString('readerScreen.bottomSheet.textSize')}
          min={8}
          onChange={textSize => update({ textSize })}
          step={1}
          value={settings.textSize}
        />
        <ReaderValueControl
          decimals={1}
          label={getString('readerScreen.bottomSheet.lineHeight')}
          max={2}
          min={1.3}
          onChange={lineHeight => update({ lineHeight })}
          step={0.1}
          value={settings.lineHeight}
        />
        <ReaderValueControl
          label={getString('readerScreen.bottomSheet.padding')}
          max={50}
          min={0}
          onChange={padding => update({ padding })}
          step={2}
          unit="px"
          value={settings.padding}
        />
        <ReaderValueControl
          decimals={2}
          label={getString('readerSettings.paragraphIndent')}
          max={4}
          min={0}
          onChange={paragraphIndent => update({ paragraphIndent })}
          step={0.25}
          unit="em"
          value={settings.paragraphIndent}
        />
        <ReaderValueControl
          decimals={2}
          label={getString('readerSettings.paragraphSpacing')}
          max={3}
          min={0}
          onChange={paragraphSpacing => update({ paragraphSpacing })}
          step={0.25}
          unit="em"
          value={settings.paragraphSpacing}
        />
        <ReaderTextAlignSelector />
        <List.Item
          description={fontName || getString('readerSettings.systemDefault')}
          onPress={fontPicker.setTrue}
          theme={theme}
          title={getString('readerSettings.font')}
        />
      </BottomSheetScrollView>
      <Portal>
        <FontPickerModal
          onDismiss={fontPicker.setFalse}
          visible={fontPicker.value}
        />
      </Portal>
    </>
  );
};

export default DisplayTab;

const styles = StyleSheet.create({
  content: { paddingBottom: 24, paddingTop: 8 },
});
