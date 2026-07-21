import { List, StableTextInput, SwitchItem } from '@components';
import { useTheme } from '@hooks/persisted';
import { useTranslateSettings } from '@hooks/persisted/useSettings';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const retryMaxAttemptsConfig = {
  min: 1,
  max: 5,
};

const chunkWordLimitConfig = {
  min: 300,
  max: 10000,
};

const LLMTranslationStabilitySection = () => {
  const theme = useTheme();
  const {
    llmChunkingEnabled,
    llmChunkWordLimit,
    llmDisableStructuredOutput,
    llmRetryEnabled,
    llmRetryMaxAttempts,
    setTranslateSettings,
  } = useTranslateSettings();
  const [chunkWordLimitText, setChunkWordLimitText] = useState(
    String(llmChunkWordLimit),
  );
  const [retryAttemptsText, setRetryAttemptsText] = useState(
    String(llmRetryMaxAttempts),
  );

  const saveChunkWordLimit = () => {
    const value = parseInt(chunkWordLimitText, 10);
    if (
      !isNaN(value) &&
      value >= chunkWordLimitConfig.min &&
      value <= chunkWordLimitConfig.max
    ) {
      setTranslateSettings({ llmChunkWordLimit: value });
      return;
    }

    setChunkWordLimitText(String(llmChunkWordLimit));
    showToast(
      getString('aiSettingsScreen.invalidChunkWordLimit', chunkWordLimitConfig),
    );
  };

  const saveRetryMaxAttempts = () => {
    const value = parseInt(retryAttemptsText, 10);
    if (
      !isNaN(value) &&
      value >= retryMaxAttemptsConfig.min &&
      value <= retryMaxAttemptsConfig.max
    ) {
      setTranslateSettings({ llmRetryMaxAttempts: value });
      return;
    }

    setRetryAttemptsText(String(llmRetryMaxAttempts));
    showToast(
      getString(
        'aiSettingsScreen.invalidRetryMaxAttempts',
        retryMaxAttemptsConfig,
      ),
    );
  };

  return (
    <>
      <List.Divider theme={theme} />
      <List.SubHeader theme={theme}>
        {getString('aiSettingsScreen.llmTranslationStability')}
      </List.SubHeader>
      <SwitchItem
        description={getString('aiSettingsScreen.chunkingEnabledDesc')}
        label={getString('aiSettingsScreen.chunkingEnabled')}
        onPress={() =>
          setTranslateSettings({
            llmChunkingEnabled: !llmChunkingEnabled,
          })
        }
        theme={theme}
        value={llmChunkingEnabled}
      />
      {llmChunkingEnabled ? (
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: theme.onSurface }]}>
            {getString('aiSettingsScreen.chunkWordLimit', chunkWordLimitConfig)}
          </Text>
          <StableTextInput
            keyboardType="number-pad"
            maxLength={5}
            onBlur={saveChunkWordLimit}
            onChangeText={setChunkWordLimitText}
            style={[
              styles.numberInput,
              {
                backgroundColor: theme.surfaceVariant,
                borderColor: theme.outline,
                color: theme.onSurface,
              },
            ]}
            value={chunkWordLimitText}
          />
        </View>
      ) : null}
      <SwitchItem
        description={getString('aiSettingsScreen.retryEnabledDesc')}
        label={getString('aiSettingsScreen.retryEnabled')}
        onPress={() =>
          setTranslateSettings({
            llmRetryEnabled: !llmRetryEnabled,
          })
        }
        theme={theme}
        value={llmRetryEnabled}
      />
      {llmRetryEnabled ? (
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: theme.onSurface }]}>
            {getString(
              'aiSettingsScreen.retryMaxAttempts',
              retryMaxAttemptsConfig,
            )}
          </Text>
          <StableTextInput
            keyboardType="number-pad"
            maxLength={1}
            onBlur={saveRetryMaxAttempts}
            onChangeText={setRetryAttemptsText}
            style={[
              styles.numberInput,
              {
                backgroundColor: theme.surfaceVariant,
                borderColor: theme.outline,
                color: theme.onSurface,
              },
            ]}
            value={retryAttemptsText}
          />
        </View>
      ) : null}
      <SwitchItem
        description={getString('aiSettingsScreen.disableStructuredOutputDesc')}
        label={getString('aiSettingsScreen.disableStructuredOutput')}
        onPress={() =>
          setTranslateSettings({
            llmDisableStructuredOutput: !llmDisableStructuredOutput,
          })
        }
        theme={theme}
        value={llmDisableStructuredOutput}
      />
    </>
  );
};

export default LLMTranslationStabilitySection;

const styles = StyleSheet.create({
  inputLabel: {
    flex: 1,
    fontSize: 14,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  numberInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    height: 44,
    textAlign: 'center',
    width: 80,
  },
});
