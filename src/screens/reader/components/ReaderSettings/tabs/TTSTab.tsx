import {
  Button,
  List,
  SegmentedControl,
  StableTextInput,
  SwitchItem,
} from '@components';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import Slider from '@react-native-community/slider';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import { getAvailableVoicesAsync, type Voice } from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import useTTSPlayback from '../../Hooks/useTTSPlayback';
import VoicePickerModal from '../components/VoicePickerModal';
import { isTikTokVoice, TIKTOK_VOICES } from '../TTSVoices';

type TTSSettings = NonNullable<ChapterReaderSettings['tts']>;

const TTSTab = () => {
  const theme = useTheme();
  const general = useChapterGeneralSettings();
  const reader = useChapterReaderSettings();
  const tts = reader.tts ?? {};
  const readerSettingsRef = useRef<ChapterReaderSettings>(reader);
  readerSettingsRef.current = reader;
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicePickerVisible, setVoicePickerVisible] = useState(false);
  const [demoText, setDemoText] = useState('');
  const [demoPlaying, setDemoPlaying] = useState(false);
  const playback = useTTSPlayback({
    readerSettingsRef,
    onDone: () => setDemoPlaying(false),
    onError: error => {
      setDemoPlaying(false);
      showToast(
        getString(
          error === 'voice-required'
            ? 'readerSettings.tts.voiceRequiredError'
            : error === 'tiktok-unavailable'
            ? 'readerSettings.tts.engineUnavailableError'
            : 'readerSettings.tts.playbackError',
        ),
      );
    },
    onInterrupted: () => setDemoPlaying(false),
    onStart: () => setDemoPlaying(true),
  });

  useEffect(() => {
    let active = true;
    getAvailableVoicesAsync()
      .then(result => {
        if (active) {
          setVoices(result.sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {
        if (active) {
          setVoices([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingVoices(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    playback.stop();
    setDemoPlaying(false);
  }, [general.TTSEnable, playback, tts.engine, tts.voice?.identifier]);

  const update = useCallback(
    (values: Partial<TTSSettings>) =>
      reader.setChapterReaderSettings({ tts: { ...reader.tts, ...values } }),
    [reader],
  );
  const changeEngine = (engine: 'native' | 'tiktok') => {
    const compatible =
      engine === 'tiktok'
        ? isTikTokVoice(tts.voice)
        : !isTikTokVoice(tts.voice);
    update({ engine, voice: compatible ? tts.voice : undefined });
  };
  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
    suffix = '',
  ) => (
    <View style={styles.sliderSection}>
      <Text
        style={[styles.label, { color: theme.onSurface }]}
      >{`${label}: ${value.toFixed(step < 1 ? 1 : 0)}${suffix}`}</Text>
      <View style={styles.sliderRow}>
        <IconButton
          icon="minus"
          iconColor={theme.primary}
          onPress={() => onChange(Math.max(min, value - step))}
          size={20}
        />
        <Slider
          maximumTrackTintColor={theme.outlineVariant}
          maximumValue={max}
          minimumTrackTintColor={theme.primary}
          minimumValue={min}
          onSlidingComplete={onChange}
          step={step}
          style={styles.slider}
          thumbTintColor={theme.primary}
          value={value}
        />
        <IconButton
          icon="plus"
          iconColor={theme.primary}
          onPress={() => onChange(Math.min(max, value + step))}
          size={20}
        />
      </View>
    </View>
  );
  const compatibleVoice =
    tts.engine === 'tiktok'
      ? isTikTokVoice(tts.voice)
        ? tts.voice
        : undefined
      : isTikTokVoice(tts.voice) ||
        (!loadingVoices &&
          tts.voice?.identifier != null &&
          !voices.some(voice => voice.identifier === tts.voice?.identifier))
      ? undefined
      : tts.voice;
  const selectedVoice =
    compatibleVoice?.name ??
    (tts.engine === 'tiktok'
      ? getString('readerSettings.tts.notSelected')
      : getString('readerSettings.systemDefault'));

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <List.SubHeader theme={theme}>
          {getString('readerSettings.tts.section')}
        </List.SubHeader>
        <SwitchItem
          label={getString('readerSettings.tts.enable')}
          onPress={() =>
            general.setChapterGeneralSettings({ TTSEnable: !general.TTSEnable })
          }
          theme={theme}
          value={general.TTSEnable}
        />
        {general.TTSEnable ? (
          <>
            <View style={styles.segment}>
              <Text style={[styles.label, { color: theme.onSurface }]}>
                {getString('readerSettings.tts.engine')}
              </Text>
              <SegmentedControl
                options={[
                  {
                    label: getString('readerSettings.tts.native'),
                    value: 'native',
                  },
                  { label: 'TikTok', value: 'tiktok' },
                ]}
                onChange={changeEngine}
                theme={theme}
                value={tts.engine ?? 'native'}
              />
            </View>
            <List.Item
              description={selectedVoice}
              onPress={() => setVoicePickerVisible(true)}
              theme={theme}
              title={getString('readerSettings.tts.voice')}
            />
            {slider(
              getString('readerSettings.tts.rate'),
              tts.rate ?? 1,
              0.1,
              5,
              0.1,
              value => update({ rate: value }),
              'x',
            )}
            {slider(
              getString('readerSettings.tts.pitch'),
              tts.pitch ?? 1,
              0.1,
              5,
              0.1,
              value => update({ pitch: value }),
            )}
            {tts.engine === 'tiktok'
              ? slider(
                  getString('readerSettings.tts.queueSize'),
                  tts.queueSize ?? 3,
                  1,
                  10,
                  1,
                  value => update({ queueSize: value }),
                )
              : null}
            <SwitchItem
              label={getString('readerSettings.tts.autoPageAdvance')}
              onPress={() => update({ autoPageAdvance: !tts.autoPageAdvance })}
              theme={theme}
              value={tts.autoPageAdvance === true}
            />
            <SwitchItem
              label={getString('readerSettings.tts.scrollToTop')}
              onPress={() => update({ scrollToTop: tts.scrollToTop === false })}
              theme={theme}
              value={tts.scrollToTop !== false}
            />
            <View style={styles.reset}>
              <Button
                mode="outlined"
                onPress={() =>
                  reader.setChapterReaderSettings({
                    tts: {
                      autoPageAdvance: false,
                      engine: 'native',
                      pitch: 1,
                      queueSize: 3,
                      rate: 1,
                      scrollToTop: true,
                    },
                  })
                }
                title={getString('common.reset')}
              />
            </View>
            <List.Divider theme={theme} />
            <List.SubHeader theme={theme}>
              {getString('readerSettings.tts.demoSection')}
            </List.SubHeader>
            <View style={styles.demo}>
              <StableTextInput
                label={getString('readerSettings.tts.demoInput')}
                mode="outlined"
                multiline
                numberOfLines={3}
                onChangeText={setDemoText}
                render={props => (
                  <BottomSheetTextInput
                    {...(props as React.ComponentProps<
                      typeof BottomSheetTextInput
                    >)}
                  />
                )}
                theme={{ colors: { ...theme } }}
                value={demoText}
              />
              <View style={styles.demoActions}>
                <Button
                  disabled={!demoText.trim() || demoPlaying}
                  mode="contained"
                  onPress={() => {
                    if (playback.playText(demoText)) {
                      setDemoPlaying(true);
                    }
                  }}
                  title={getString('readerSettings.tts.play')}
                />
                <Button
                  disabled={!demoPlaying}
                  mode="outlined"
                  onPress={() => {
                    playback.stop();
                    setDemoPlaying(false);
                  }}
                  title={getString('readerSettings.tts.stop')}
                />
              </View>
            </View>
          </>
        ) : null}
      </BottomSheetScrollView>
      <VoicePickerModal
        currentVoice={compatibleVoice}
        loading={tts.engine === 'native' && loadingVoices}
        onDismiss={() => setVoicePickerVisible(false)}
        onSelect={voice => update({ voice })}
        showSystemVoice={tts.engine !== 'tiktok'}
        visible={voicePickerVisible}
        voices={tts.engine === 'tiktok' ? TIKTOK_VOICES : voices}
      />
    </>
  );
};

export default TTSTab;

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  demo: { gap: 12, paddingHorizontal: 16 },
  demoActions: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 16, marginBottom: 8 },
  reset: { alignItems: 'flex-start', padding: 16 },
  segment: { gap: 8, padding: 16 },
  slider: { flex: 1 },
  sliderRow: { alignItems: 'center', flexDirection: 'row' },
  sliderSection: { paddingHorizontal: 16, paddingVertical: 8 },
});
