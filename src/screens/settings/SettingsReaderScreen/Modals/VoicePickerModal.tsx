import { KeyboardAwareModal, StableTextInput } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { LegendList } from '@legendapp/list';
import { Voice } from 'expo-speech';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

interface VoicePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  voices: Voice[];
}

const VoicePickerModal: React.FC<VoicePickerModalProps> = ({
  onDismiss,
  visible,
  voices,
}) => {
  const theme = useTheme();
  const [searchedVoices, setSearchedVoices] = useState<Voice[]>([]);
  const [searchText, setSearchText] = useState('');
  const { setChapterReaderSettings, tts } = useChapterReaderSettings();

  return (
    <KeyboardAwareModal
      visible={visible}
      onDismiss={onDismiss}
      scrollable={false}
      containerStyle={styles.containerStyle}
      contentContainerStyle={styles.contentContainer}
    >
      <LegendList
        recycleItems
        ListHeaderComponent={
          <StableTextInput
            mode="outlined"
            underlineColor={theme.outline}
            theme={{ colors: { ...theme } }}
            onChangeText={text => {
              setSearchText(text);
              setSearchedVoices(
                voices.filter(voice =>
                  voice.name
                    .toLocaleLowerCase()
                    .includes(text.toLocaleLowerCase()),
                ),
              );
            }}
            value={searchText}
            placeholder="Search voice"
          />
        }
        ListHeaderComponentStyle={styles.paddingHorizontal}
        data={searchText ? searchedVoices : voices}
        extraData={tts?.voice}
        renderItem={({ item }) => (
          <RadioButton
            key={item.identifier}
            status={item.identifier === tts?.voice?.identifier}
            onPress={() =>
              setChapterReaderSettings({ tts: { ...tts, voice: item } })
            }
            label={item.name + ` (${item.language})`}
            labelStyle={{ fontFamily: item.name }}
            theme={theme}
          />
        )}
        keyExtractor={(item, index) =>
          item.identifier || `voice_${index}_${item.name}`
        }
        estimatedItemSize={64}
        ListEmptyComponent={
          <ActivityIndicator
            size={24}
            style={styles.marginTop}
            color={theme.primary}
          />
        }
      />
    </KeyboardAwareModal>
  );
};

export default VoicePickerModal;

const styles = StyleSheet.create({
  containerStyle: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  paddingHorizontal: { paddingHorizontal: 12 },
  marginTop: { marginTop: 16 },
});
