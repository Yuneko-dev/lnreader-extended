import { ToggleColorButton } from '@components/Common/ToggleButton';
import { useChapterReaderSettings } from '@hooks/persisted';
import type { ReaderTheme } from '@hooks/persisted/useSettings';
import { presetReaderThemes } from '@utils/constants/readerConstants';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

const ReaderThemeSelector = () => {
  const settings = useChapterReaderSettings();
  return (
    <View style={styles.container}>
      <FlatList
        data={
          [...settings.customThemes, ...presetReaderThemes] as ReaderTheme[]
        }
        horizontal
        keyExtractor={(item, index) =>
          `${item.backgroundColor}_${item.textColor}_${index}`
        }
        renderItem={({ item }) => (
          <ToggleColorButton
            backgroundColor={item.backgroundColor}
            onPress={() =>
              settings.setChapterReaderSettings({
                theme: item.backgroundColor,
                textColor: item.textColor,
              })
            }
            selected={
              settings.theme === item.backgroundColor &&
              settings.textColor === item.textColor
            }
            textColor={item.textColor}
          />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

export default ReaderThemeSelector;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8 },
});
