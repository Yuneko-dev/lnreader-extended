import { Button, List } from '@components';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import Slider from '@react-native-community/slider';
import { getString } from '@strings/translations';
import { getLocales } from 'expo-localization';
import { getAvailableVoicesAsync, Voice } from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip, IconButton, Modal, Portal } from 'react-native-paper';

import ReaderSheetPreferenceItem from './ReaderSheetPreferenceItem';

const TIKTOK_VOICES = [
  { id: 'BV074_streaming', name: 'Cô gái hoạt ngôn', lang: 'vi' },
  { id: 'BV421_vivn_streaming', name: 'Cô gái ngọt ngào', lang: 'vi' },
  { id: 'BV075_streaming', name: 'Thanh niên tự tin', lang: 'vi' },
  { id: 'vi_female_huong', name: 'Giọng nữ phổ thông', lang: 'vi' },
  { id: 'en_male_jomboy', name: 'Game On', lang: 'en' },
  { id: 'en_us_002', name: 'Jessie', lang: 'en' },
  { id: 'es_mx_002', name: 'Warm', lang: 'en' },
  { id: 'en_male_funny', name: 'Wacky', lang: 'en' },
  { id: 'en_us_ghostface', name: 'Scream', lang: 'en' },
  { id: 'en_female_samc', name: 'Empathetic', lang: 'en' },
  { id: 'en_male_cody', name: 'Serious', lang: 'en' },
  { id: 'en_female_makeup', name: 'Beauty Guru', lang: 'en' },
  { id: 'en_female_richgirl', name: 'Bestie', lang: 'en' },
  { id: 'en_male_grinch', name: 'Trickster', lang: 'en' },
  { id: 'en_us_006', name: 'Joey', lang: 'en' },
  { id: 'en_male_narration', name: 'Story Teller', lang: 'en' },
  { id: 'en_male_deadpool', name: 'Mr. GoodGuy', lang: 'en' },
  { id: 'en_uk_001', name: 'Narrator', lang: 'en' },
  { id: 'en_uk_003', name: 'Male English UK', lang: 'en' },
  { id: 'en_au_001', name: 'Metro', lang: 'en' },
  { id: 'en_male_jarvis', name: 'Alfred', lang: 'en' },
  { id: 'en_male_ashmagic', name: 'ashmagic', lang: 'en' },
  { id: 'en_male_olantekkers', name: 'olantekkers', lang: 'en' },
  { id: 'en_male_ukneighbor', name: 'Lord Cringe', lang: 'en' },
  { id: 'en_male_ukbutler', name: 'Mr. Meticulous', lang: 'en' },
  { id: 'en_female_shenna', name: 'Debutante', lang: 'en' },
  { id: 'en_female_pansino', name: 'Varsity', lang: 'en' },
  { id: 'en_male_trevor', name: 'Marty', lang: 'en' },
  { id: 'en_female_f08_twinkle', name: 'Pop Lullaby', lang: 'en' },
  { id: 'en_male_m03_classical', name: 'Classic Electric', lang: 'en' },
  { id: 'en_female_betty', name: 'Bae', lang: 'en' },
  { id: 'en_male_cupid', name: 'Cupid', lang: 'en' },
  { id: 'en_female_grandma', name: 'Granny', lang: 'en' },
  { id: 'en_male_m2_xhxs_m03_christmas', name: 'Cozy', lang: 'en' },
  { id: 'en_male_santa_narration', name: 'Author', lang: 'en' },
  { id: 'en_male_sing_deep_jingle', name: 'Caroler', lang: 'en' },
  { id: 'en_male_santa_effect', name: 'Santa', lang: 'en' },
  { id: 'en_female_ht_f08_newyear', name: 'NYE 2023', lang: 'en' },
  { id: 'en_male_wizard', name: 'Magician', lang: 'en' },
  { id: 'en_female_ht_f08_halloween', name: 'Opera', lang: 'en' },
  { id: 'en_female_ht_f08_glorious', name: 'Euphoric', lang: 'en' },
  { id: 'en_male_sing_funny_it_goes_up', name: 'Hypetrain', lang: 'en' },
  { id: 'en_female_ht_f08_wonderful_world', name: 'Melodrama', lang: 'en' },
  { id: 'en_male_m2_xhxs_m03_silly', name: 'Quirky Time', lang: 'en' },
  { id: 'en_female_emotional', name: 'Peaceful', lang: 'en' },
  { id: 'en_male_m03_sunshine_soon', name: 'Toon Beat', lang: 'en' },
  { id: 'en_female_f08_warmy_breeze', name: 'Open Mic', lang: 'en' },
  { id: 'en_male_m03_lobby', name: 'Jingle', lang: 'en' },
  { id: 'en_male_sing_funny_thanksgiving', name: 'Thanksgiving', lang: 'en' },
  { id: 'en_female_f08_salut_damour', name: 'Cottagecore', lang: 'en' },
  { id: 'en_us_007', name: 'Professor', lang: 'en' },
  { id: 'en_us_009', name: 'Scientist', lang: 'en' },
  { id: 'en_us_010', name: 'Confidence', lang: 'en' },
  { id: 'en_au_002', name: 'Smooth', lang: 'en' },
  { id: 'en_us_ghostface', name: 'Ghost Face', lang: 'en' },
  { id: 'en_us_chewbacca', name: 'Chewbacca', lang: 'en' },
  { id: 'en_us_c3po', name: 'C3PO', lang: 'en' },
  { id: 'en_us_stitch', name: 'Stitch', lang: 'en' },
  { id: 'en_us_stormtrooper', name: 'Stormtrooper', lang: 'en' },
  { id: 'en_us_rocket', name: 'Rocket', lang: 'en' },
  { id: 'en_female_madam_leota', name: 'Madame Leota', lang: 'en' },
  { id: 'en_male_ghosthost', name: 'Ghost Host', lang: 'en' },
  { id: 'en_male_pirate', name: 'Pirate', lang: 'en' },
  { id: 'fr_001', name: 'French - Male 1', lang: 'fr' },
  { id: 'fr_002', name: 'French - Male 2', lang: 'fr' },
  { id: 'es_002', name: 'Spanish (Spain) - Male', lang: 'es' },
  { id: 'es_mx_002', name: 'Spanish MX - Male', lang: 'es' },
  { id: 'br_001', name: 'Portuguese BR - Female 1', lang: 'pt' },
  { id: 'br_003', name: 'Portuguese BR - Female 2', lang: 'pt' },
  { id: 'br_004', name: 'Portuguese BR - Female 3', lang: 'pt' },
  { id: 'br_005', name: 'Portuguese BR - Male', lang: 'pt' },
  { id: 'bp_female_ivete', name: 'Ivete Sangalo', lang: 'pt' },
  { id: 'bp_female_ludmilla', name: 'Ludmilla', lang: 'pt' },
  { id: 'pt_female_lhays', name: 'Lhays Macedo', lang: 'pt' },
  { id: 'pt_female_laizza', name: 'Laizza', lang: 'pt' },
  { id: 'pt_male_bueno', name: 'Galvão Bueno', lang: 'pt' },
  { id: 'de_001', name: 'German - Female', lang: 'de' },
  { id: 'de_002', name: 'German - Male', lang: 'de' },
  { id: 'id_001', name: 'Indonesian - Female', lang: 'id' },
  { id: 'jp_001', name: 'Japanese - Female 1', lang: 'ja' },
  { id: 'jp_003', name: 'Japanese - Female 2', lang: 'ja' },
  { id: 'jp_005', name: 'Japanese - Female 3', lang: 'ja' },
  { id: 'jp_006', name: 'Japanese - Male', lang: 'ja' },
  { id: 'jp_female_fujicochan', name: 'りーさ', lang: 'ja' },
  { id: 'jp_female_hasegawariona', name: '世羅鈴', lang: 'ja' },
  { id: 'jp_male_keiichinakano', name: 'Morio’s Kitchen', lang: 'ja' },
  { id: 'jp_female_oomaeaika', name: '夏絵ココ', lang: 'ja' },
  { id: 'jp_male_yujinchigusa', name: '低音ボイス', lang: 'ja' },
  { id: 'jp_female_shirou', name: '四郎', lang: 'ja' },
  { id: 'jp_male_tamawakazuki', name: '玉川寿紀', lang: 'ja' },
  { id: 'jp_female_kaorishoji', name: '庄司果織', lang: 'ja' },
  { id: 'jp_female_yagishaki', name: '八木沙季', lang: 'ja' },
  { id: 'jp_male_hikakin', name: 'ヒカキン', lang: 'ja' },
  { id: 'jp_female_rei', name: '丸山礼', lang: 'ja' },
  { id: 'jp_male_shuichiro', name: '修一朗', lang: 'ja' },
  { id: 'jp_male_matsudake', name: 'マツダ家の日常', lang: 'ja' },
  { id: 'jp_female_machikoriiita', name: 'まちこりーた', lang: 'ja' },
  { id: 'jp_male_matsuo', name: 'モジャオ', lang: 'ja' },
  { id: 'jp_male_osada', name: 'モリスケ', lang: 'ja' },
  { id: 'kr_002', name: 'Korean - Male 1', lang: 'ko' },
  { id: 'kr_003', name: 'Korean - Female', lang: 'ko' },
  { id: 'kr_004', name: 'Korean - Male 2', lang: 'ko' },
];

interface VoicePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  voices: Voice[];
  onSelect: (voice: Voice) => void;
  currentVoice?: Voice;
}

const VoicePickerModal: React.FC<
  VoicePickerModalProps & { isTikTok: boolean }
> = ({ visible, onDismiss, voices, onSelect, currentVoice, isTikTok }) => {
  const theme = useTheme();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  // Get system language safely using getLocales()
  const systemLocale = getLocales()[0]?.languageCode || 'en';

  const availableVoices = useMemo(() => {
    if (isTikTok) {
      return TIKTOK_VOICES.map(v => ({
        identifier: v.id,
        name: v.name,
        language: v.lang,
        quality: 'Default',
      })) as Voice[];
    }
    return voices;
  }, [isTikTok, voices]);

  // Get unique languages from voices
  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    availableVoices.forEach(voice => {
      if (voice.language) {
        const lang = voice.language.split('-')[0];
        languages.add(lang);
      }
    });
    return Array.from(languages).sort((a, b) => {
      // System language first
      if (a === systemLocale) return -1;
      if (b === systemLocale) return 1;
      return a.localeCompare(b);
    });
  }, [availableVoices, systemLocale]);

  // Filter voices by selected languages
  const filteredVoices = useMemo(() => {
    if (selectedLanguages.length === 0) {
      // Show system language voices by default
      return availableVoices.filter(voice => {
        if (voice.name === 'System') return true;
        const lang = voice.language?.split('-')[0];
        return lang === systemLocale;
      });
    }

    return availableVoices.filter(voice => {
      if (voice.name === 'System') return true;
      const lang = voice.language?.split('-')[0];
      return lang && selectedLanguages.includes(lang);
    });
  }, [availableVoices, selectedLanguages, systemLocale]);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(lang)) {
        return prev.filter(l => l !== lang);
      } else {
        return [...prev, lang];
      }
    });
  };

  useEffect(() => {
    // Reset to system language when modal opens
    if (visible) {
      setSelectedLanguages([]);
    }
  }, [visible]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContent,
          { backgroundColor: theme.surface },
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
          Select Voice
        </Text>

        {/* Language Filter */}
        <View style={styles.languageFilterContainer}>
          <Text style={[styles.filterLabel, { color: theme.onSurfaceVariant }]}>
            Filter by language:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.languageChipsScroll}
          >
            {availableLanguages.map(lang => {
              const isSelected = selectedLanguages.includes(lang);
              const isSystemLang = lang === systemLocale;
              const showingSystemOnly = selectedLanguages.length === 0;
              const isActive =
                isSelected || (showingSystemOnly && isSystemLang);

              return (
                <Chip
                  key={lang}
                  selected={isActive}
                  onPress={() => toggleLanguage(lang)}
                  style={[
                    styles.languageChip,
                    isActive && { backgroundColor: theme.primary },
                  ]}
                  textStyle={[
                    styles.languageChipText,
                    { color: isActive ? theme.onPrimary : theme.onSurface },
                  ]}
                >
                  {lang.toUpperCase()}
                  {isSystemLang && ' (System)'}
                </Chip>
              );
            })}
          </ScrollView>
        </View>

        {/* Voice List */}
        <ScrollView style={styles.voiceList}>
          {filteredVoices.length === 0 ? (
            <Text
              style={[styles.noVoicesText, { color: theme.onSurfaceVariant }]}
            >
              No voices available for selected languages
            </Text>
          ) : (
            filteredVoices.map((voice: Voice, index: number) => (
              <Pressable
                key={index}
                style={[
                  styles.voiceItem,
                  currentVoice?.identifier === voice.identifier && {
                    backgroundColor: theme.surfaceVariant,
                  },
                ]}
                onPress={() => {
                  onSelect(voice);
                  onDismiss();
                }}
              >
                <View style={styles.voiceItemContent}>
                  <Text
                    style={[styles.voiceItemText, { color: theme.onSurface }]}
                  >
                    {voice.name}
                  </Text>
                  {voice.language && (
                    <Text
                      style={[
                        styles.voiceItemLanguage,
                        { color: theme.onSurfaceVariant },
                      ]}
                    >
                      {voice.language}
                    </Text>
                  )}
                </View>
                {currentVoice?.identifier === voice.identifier && (
                  <Text style={[styles.checkIcon, { color: theme.primary }]}>
                    ✓
                  </Text>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>

        <Button
          title="Cancel"
          mode="outlined"
          onPress={onDismiss}
          style={styles.cancelButton}
        />
      </Modal>
    </Portal>
  );
};

const TTSTab: React.FC = () => {
  const theme = useTheme();
  const { TTSEnable = true, setChapterGeneralSettings } =
    useChapterGeneralSettings();

  const { tts, setChapterReaderSettings } = useChapterReaderSettings();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  useEffect(() => {
    getAvailableVoicesAsync().then(res => {
      res.sort((a, b) => a.name.localeCompare(b.name));
      setVoices([{ name: 'System', language: 'System' } as Voice, ...res]);
    });
  }, []);

  const handleVoiceSelect = useCallback(
    (voice: Voice) => {
      setChapterReaderSettings({ tts: { ...tts, voice } });
    },
    [tts, setChapterReaderSettings],
  );

  return (
    <>
      <BottomSheetScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <List.SubHeader theme={theme}>Text to Speech</List.SubHeader>

          <ReaderSheetPreferenceItem
            label="Enable TTS"
            value={TTSEnable}
            onPress={() => setChapterGeneralSettings({ TTSEnable: !TTSEnable })}
            theme={theme}
          />

          {TTSEnable && (
            <>
              <View style={styles.engineRow}>
                <Text style={[styles.label, { color: theme.onSurface }]}>
                  Engine
                </Text>
                <View style={styles.buttonGroup}>
                  <Button
                    title="Native"
                    mode={tts?.engine === 'native' ? 'contained' : 'outlined'}
                    onPress={() =>
                      setChapterReaderSettings({
                        tts: { ...tts, engine: 'native' },
                      })
                    }
                    style={styles.flexBtn}
                  />
                  <View style={styles.btnSpacer} />
                  <Button
                    title="TikTok"
                    mode={tts?.engine === 'tiktok' ? 'contained' : 'outlined'}
                    onPress={() =>
                      setChapterReaderSettings({
                        tts: { ...tts, engine: 'tiktok' },
                      })
                    }
                    style={styles.flexBtn}
                  />
                </View>
              </View>
              <Pressable
                style={styles.settingItem}
                onPress={() => setVoiceModalVisible(true)}
              >
                <Text style={[styles.label, { color: theme.onSurface }]}>
                  Voice
                </Text>
                <Text style={[styles.value, { color: theme.onSurfaceVariant }]}>
                  {tts?.voice?.name ||
                    (tts?.engine === 'tiktok' ? 'Select Voice' : 'System')}
                </Text>
              </Pressable>

              <View style={styles.sliderSection}>
                <Text style={[styles.sliderLabel, { color: theme.onSurface }]}>
                  Speed: {tts?.rate?.toFixed(1) || '1.0'}x
                </Text>
                <View style={styles.sliderControls}>
                  <IconButton
                    icon="minus"
                    size={20}
                    iconColor={theme.primary}
                    onPress={() => {
                      const newValue = Math.max(0.1, (tts?.rate || 1) - 0.1);
                      setChapterReaderSettings({
                        tts: { ...tts, rate: newValue },
                      });
                    }}
                  />
                  <Slider
                    style={styles.sliderContainer}
                    value={tts?.rate || 1}
                    minimumValue={0.1}
                    maximumValue={5}
                    step={0.1}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor={theme.surfaceVariant}
                    thumbTintColor={theme.primary}
                    onSlidingComplete={value =>
                      setChapterReaderSettings({ tts: { ...tts, rate: value } })
                    }
                  />
                  <IconButton
                    icon="plus"
                    size={20}
                    iconColor={theme.primary}
                    onPress={() => {
                      const newValue = Math.min(5, (tts?.rate || 1) + 0.1);
                      setChapterReaderSettings({
                        tts: { ...tts, rate: newValue },
                      });
                    }}
                  />
                </View>
              </View>

              <View style={styles.sliderSection}>
                <Text style={[styles.sliderLabel, { color: theme.onSurface }]}>
                  Pitch: {tts?.pitch?.toFixed(1) || '1.0'}
                </Text>
                <View style={styles.sliderControls}>
                  <IconButton
                    icon="minus"
                    size={20}
                    iconColor={theme.primary}
                    onPress={() => {
                      const newValue = Math.max(0.1, (tts?.pitch || 1) - 0.1);
                      setChapterReaderSettings({
                        tts: { ...tts, pitch: newValue },
                      });
                    }}
                  />
                  <Slider
                    style={styles.sliderContainer}
                    value={tts?.pitch || 1}
                    minimumValue={0.1}
                    maximumValue={5}
                    step={0.1}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor={theme.surfaceVariant}
                    thumbTintColor={theme.primary}
                    onSlidingComplete={value =>
                      setChapterReaderSettings({
                        tts: { ...tts, pitch: value },
                      })
                    }
                  />
                  <IconButton
                    icon="plus"
                    size={20}
                    iconColor={theme.primary}
                    onPress={() => {
                      const newValue = Math.min(5, (tts?.pitch || 1) + 0.1);
                      setChapterReaderSettings({
                        tts: { ...tts, pitch: newValue },
                      });
                    }}
                  />
                </View>
              </View>

              {tts?.engine === 'tiktok' && (
                <View style={styles.sliderSection}>
                  <Text
                    style={[styles.sliderLabel, { color: theme.onSurface }]}
                  >
                    Queue Size: {tts?.queueSize || 3}
                  </Text>
                  <View style={styles.sliderControls}>
                    <IconButton
                      icon="minus"
                      size={20}
                      iconColor={theme.primary}
                      onPress={() => {
                        const newValue = Math.max(1, (tts?.queueSize || 3) - 1);
                        setChapterReaderSettings({
                          tts: { ...tts, queueSize: newValue },
                        });
                      }}
                    />
                    <Slider
                      style={styles.sliderContainer}
                      value={tts?.queueSize || 3}
                      minimumValue={1}
                      maximumValue={10}
                      step={1}
                      minimumTrackTintColor={theme.primary}
                      maximumTrackTintColor={theme.surfaceVariant}
                      thumbTintColor={theme.primary}
                      onSlidingComplete={value =>
                        setChapterReaderSettings({
                          tts: { ...tts, queueSize: value },
                        })
                      }
                    />
                    <IconButton
                      icon="plus"
                      size={20}
                      iconColor={theme.primary}
                      onPress={() => {
                        const newValue = Math.min(
                          10,
                          (tts?.queueSize || 3) + 1,
                        );
                        setChapterReaderSettings({
                          tts: { ...tts, queueSize: newValue },
                        });
                      }}
                    />
                  </View>
                </View>
              )}

              <ReaderSheetPreferenceItem
                label="Auto Page Advance"
                value={tts?.autoPageAdvance === true}
                onPress={() =>
                  setChapterReaderSettings({
                    tts: {
                      ...tts,
                      autoPageAdvance: !(tts?.autoPageAdvance === true),
                    },
                  })
                }
                theme={theme}
              />

              <ReaderSheetPreferenceItem
                label="Scroll to Top"
                value={tts?.scrollToTop !== false}
                onPress={() =>
                  setChapterReaderSettings({
                    tts: { ...tts, scrollToTop: !(tts?.scrollToTop !== false) },
                  })
                }
                theme={theme}
              />

              <View style={styles.resetButtonContainer}>
                <Button
                  title={getString('common.reset')}
                  mode="outlined"
                  onPress={() => {
                    setChapterReaderSettings({
                      tts: {
                        pitch: 1,
                        rate: 1,
                        voice: { name: 'System', language: 'System' } as Voice,
                        autoPageAdvance: false,
                        scrollToTop: true,
                      },
                    });
                  }}
                  style={styles.resetButton}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </BottomSheetScrollView>

      <VoicePickerModal
        visible={voiceModalVisible}
        onDismiss={() => setVoiceModalVisible(false)}
        voices={voices}
        onSelect={handleVoiceSelect}
        currentVoice={tts?.voice}
        isTikTok={tts?.engine === 'tiktok'}
      />
    </>
  );
};

export default React.memo(TTSTab);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    marginVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 14,
  },
  sliderSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  slider: {
    height: 40,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
  },
  resetButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resetButton: {
    alignSelf: 'flex-start',
  },
  bottomSpacing: {
    height: 24,
  },
  modalContent: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  languageFilterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  languageChipsScroll: {
    flexGrow: 0,
  },
  languageChip: {
    marginEnd: 8,
    marginBottom: 8,
  },
  voiceList: {
    maxHeight: 350,
    marginTop: 8,
  },
  voiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  voiceItemContent: {
    flex: 1,
  },
  voiceItemText: {
    fontSize: 16,
    marginBottom: 4,
  },
  voiceItemLanguage: {
    fontSize: 12,
  },
  noVoicesText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 16,
  },
  languageChipText: {
    fontSize: 12,
  },
  checkIcon: {
    fontSize: 16,
  },
  engineRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 12,
  },
  flexBtn: {
    flex: 1,
  },
  btnSpacer: {
    width: 8,
  },
});
