import { Modal } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { readerFonts } from '@utils/constants/readerConstants';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

type Props = { onDismiss: () => void; visible: boolean };

const FontPickerModal = ({ onDismiss, visible }: Props) => {
  const theme = useTheme();
  const { fontFamily, setChapterReaderSettings } = useChapterReaderSettings();
  return (
    <Modal
      contentContainerStyle={styles.container}
      onDismiss={onDismiss}
      visible={visible}
    >
      <Text style={[styles.title, { color: theme.onSurface }]}>
        {getString('readerSettings.font')}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {readerFonts.map(font => (
          <RadioButton
            key={font.fontFamily}
            label={font.name}
            labelStyle={{ fontFamily: font.fontFamily }}
            onPress={() => {
              setChapterReaderSettings({ fontFamily: font.fontFamily });
              onDismiss();
            }}
            status={fontFamily === font.fontFamily}
            theme={theme}
          />
        ))}
      </ScrollView>
    </Modal>
  );
};

export default FontPickerModal;

const styles = StyleSheet.create({
  container: { maxHeight: '70%' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
