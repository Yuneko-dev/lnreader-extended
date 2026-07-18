import { ToggleButton } from '@components/Common/ToggleButton';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { textAlignments } from '@utils/constants/readerConstants';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ReaderTextAlignSelector = () => {
  const theme = useTheme();
  const { textAlign, setChapterReaderSettings } = useChapterReaderSettings();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.onSurface }]}>
        {getString('readerScreen.bottomSheet.textAlign')}
      </Text>
      <View style={styles.controls}>
        {textAlignments.map(item => (
          <ToggleButton
            key={item.value}
            icon={item.icon}
            onPress={() => setChapterReaderSettings({ textAlign: item.value })}
            selected={item.value === textAlign}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
};

export default ReaderTextAlignSelector;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  controls: { flexDirection: 'row' },
  label: { fontSize: 16 },
});
