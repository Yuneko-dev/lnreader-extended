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
          min={0}
          step={1}
          valueKey="textSize"
        />
        <ReaderValueControl
          decimals={1}
          label={getString('readerScreen.bottomSheet.lineHeight')}
          max={2}
          min={1.3}
          step={0.1}
          valueKey="lineHeight"
        />
        <ReaderValueControl
          label={getString('readerScreen.bottomSheet.padding')}
          max={50}
          min={0}
          step={2}
          unit="px"
          valueKey="padding"
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
