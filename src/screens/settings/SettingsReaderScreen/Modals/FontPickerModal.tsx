import { Modal } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { readerFonts } from '@utils/constants/readerConstants';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Portal } from 'react-native-paper';

interface FontPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  currentFont: string;
}

const FontPickerModal: React.FC<FontPickerModalProps> = ({
  currentFont,
  onDismiss,
  visible,
}) => {
  const theme = useTheme();
  const { setChapterReaderSettings } = useChapterReaderSettings();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.title, { color: theme.onSurface }]}>Font</Text>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {readerFonts.map(item => (
            <RadioButton
              key={item.fontFamily}
              status={currentFont === item.fontFamily}
              onPress={() =>
                setChapterReaderSettings({ fontFamily: item.fontFamily })
              }
              label={item.name}
              labelStyle={{ fontFamily: item.fontFamily }}
              theme={theme}
            />
          ))}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

export default FontPickerModal;

const styles = StyleSheet.create({
  container: {
    maxHeight: '70%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  scrollView: {
    flexGrow: 0,
  },
});
