import { ToggleButton } from '@components/Common/ToggleButton';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { textAlignments } from '@utils/constants/readerConstants';
import React from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';

interface ReaderTextAlignSelectorProps {
  labelStyle?: TextStyle | TextStyle[];
}

const ReaderTextAlignSelector: React.FC<ReaderTextAlignSelectorProps> = ({
  labelStyle,
}) => {
  const theme = useTheme();
  const { textAlign, setChapterReaderSettings } = useChapterReaderSettings();

  return (
    <View style={styles.container}>
      <Text style={[{ color: theme.onSurfaceVariant }, labelStyle]}>
        {getString('readerScreen.bottomSheet.textAlign')}
      </Text>
      <View style={styles.buttonContainer}>
        {textAlignments.map(item => (
          <ToggleButton
            key={item.value}
            selected={item.value === textAlign}
            icon={item.icon}
            theme={theme}
            onPress={() => setChapterReaderSettings({ textAlign: item.value })}
          />
        ))}
      </View>
    </View>
  );
};

export default ReaderTextAlignSelector;

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
});
