import { Button, KeyboardAwareModal } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { getLocales } from 'expo-localization';
import type { Voice } from 'expo-speech';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Chip } from 'react-native-paper';

type Props = {
  currentVoice?: Voice;
  loading: boolean;
  onDismiss: () => void;
  onSelect: (voice?: Voice) => void;
  showSystemVoice: boolean;
  visible: boolean;
  voices: Voice[];
};

const VoicePickerModal = ({
  currentVoice,
  loading,
  onDismiss,
  onSelect,
  showSystemVoice,
  visible,
  voices,
}: Props) => {
  const theme = useTheme();
  const systemLanguage = getLocales()[0]?.languageCode ?? 'en';
  const [languages, setLanguages] = useState<string[]>([]);
  useEffect(() => {
    if (visible) setLanguages([]);
  }, [visible]);
  const availableLanguages = useMemo(
    () =>
      Array.from(
        new Set(
          voices
            .map(voice => voice.language?.split('-')[0])
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) =>
        a === systemLanguage
          ? -1
          : b === systemLanguage
          ? 1
          : a.localeCompare(b),
      ),
    [systemLanguage, voices],
  );
  const filteredVoices = useMemo(() => {
    const selected = languages.length ? languages : [systemLanguage];
    const matching = voices.filter(voice =>
      selected.includes(voice.language?.split('-')[0] ?? ''),
    );
    return matching.length || languages.length ? matching : voices;
  }, [languages, systemLanguage, voices]);

  return (
    <KeyboardAwareModal
      footer={
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            title={getString('common.cancel')}
          />
        </View>
      }
      onDismiss={onDismiss}
      title={getString('readerSettings.tts.voicePickerTitle')}
      visible={visible}
    >
      <Text style={[styles.filterLabel, { color: theme.onSurfaceVariant }]}>
        {getString('readerSettings.tts.filterLanguage')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.languages}
      >
        {availableLanguages.map(language => {
          const selected =
            languages.includes(language) ||
            (!languages.length && language === systemLanguage);
          return (
            <Chip
              key={language}
              onPress={() =>
                setLanguages(current =>
                  current.includes(language)
                    ? current.filter(item => item !== language)
                    : [...current, language],
                )
              }
              selected={selected}
              style={styles.chip}
            >
              {language.toUpperCase()}
            </Chip>
          );
        })}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.state} />
      ) : (
        <>
          {showSystemVoice ? (
            <RadioButton
              label={getString('readerSettings.systemDefault')}
              onPress={() => {
                onSelect(undefined);
                onDismiss();
              }}
              status={!currentVoice?.identifier}
              theme={theme}
            />
          ) : null}
          {filteredVoices.map(voice => (
            <RadioButton
              key={voice.identifier}
              label={`${voice.name} (${voice.language})`}
              onPress={() => {
                onSelect(voice);
                onDismiss();
              }}
              status={currentVoice?.identifier === voice.identifier}
              theme={theme}
            />
          ))}
          {!showSystemVoice && filteredVoices.length === 0 ? (
            <Text style={[styles.state, { color: theme.onSurfaceVariant }]}>
              {getString('readerSettings.tts.noVoices')}
            </Text>
          ) : null}
        </>
      )}
    </KeyboardAwareModal>
  );
};

export default VoicePickerModal;

const styles = StyleSheet.create({
  chip: { marginEnd: 8 },
  filterLabel: { fontSize: 13, marginBottom: 8 },
  footer: { padding: 24, paddingTop: 8 },
  languages: { flexGrow: 0, marginBottom: 12 },
  state: { padding: 24, textAlign: 'center' },
});
