import {
  Appbar,
  Button,
  EmptyView,
  List,
  SafeAreaView,
  SwitchItem,
} from '@components/index';
import { useTheme } from '@hooks/persisted';
import { useAIProviders } from '@hooks/persisted/useAIProviders';
import {
  useAppSettings,
  useTranslateSettings,
} from '@hooks/persisted/useSettings';
import { SettingsAIScreenProps } from '@navigators/types';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton, List as PaperList } from 'react-native-paper';

import AIProviderModal from './components/AIProviderModal';

// Constants
const retryMaxAttemptsConfig = {
  min: 1,
  max: 5,
};
const chunkWordLimitConfig = {
  min: 300,
  max: 10000,
};

const SettingsAIScreen = ({ navigation }: SettingsAIScreenProps) => {
  const theme = useTheme();
  const { providers, addProvider, updateProvider, removeProvider } =
    useAIProviders();
  const { backupApiKeys, setAppSettings } = useAppSettings();
  const {
    llmChunkingEnabled,
    llmChunkWordLimit,
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

  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(
    null,
  );

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title="AI Settings"
        handleGoBack={navigation.goBack}
        theme={theme}
      />
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.aiProvidersConfiguration')}
          </List.SubHeader>
          {providers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyView
                icon="(╥﹏╥)"
                description="No AI Providers configured"
                theme={theme}
              />
            </View>
          ) : (
            providers.map(p => (
              <PaperList.Item
                key={p.id}
                title={p.alias}
                description={`${p.provider} • ${p.model || 'Default model'}`}
                // eslint-disable-next-line react/no-unstable-nested-components
                left={props => (
                  <PaperList.Icon
                    {...props}
                    icon="robot-outline"
                    color={theme.primary}
                  />
                )}
                onPress={() => {
                  setEditingProviderId(p.id);
                  setProviderModalVisible(true);
                }}
                // eslint-disable-next-line react/no-unstable-nested-components
                right={props => (
                  <IconButton
                    {...props}
                    icon="trash-can-outline"
                    iconColor={theme.error}
                    size={24}
                    onPress={() => removeProvider(p.id)}
                    style={styles.deleteButton}
                  />
                )}
                titleStyle={{ color: theme.onSurface }}
                descriptionStyle={{ color: theme.onSurfaceVariant }}
                style={styles.listItem}
              />
            ))
          )}

          <View style={styles.addBtnContainer}>
            <Button
              title={getString('aiSettingsScreen.addProvider')}
              mode="contained"
              icon="plus"
              onPress={() => {
                setEditingProviderId(null);
                setProviderModalVisible(true);
              }}
              style={styles.addBtn}
            />
          </View>
        </List.Section>

        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.systemPrompts')}
          </List.SubHeader>
          <PaperList.Item
            title={getString('aiSettingsScreen.translateSystemPrompts')}
            description={getString(
              'aiSettingsScreen.translateSystemPromptsDesc',
            )}
            // eslint-disable-next-line react/no-unstable-nested-components
            left={props => (
              <PaperList.Icon
                {...props}
                icon="text-box-edit-outline"
                color={theme.primary}
              />
            )}
            onPress={() => {
              navigation.navigate('AIPromptsSettings');
            }}
            titleStyle={{ color: theme.onSurface }}
            descriptionStyle={{ color: theme.onSurfaceVariant }}
            style={styles.listItem}
          />
        </List.Section>

        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('common.backup')}
          </List.SubHeader>
          <SwitchItem
            label={getString('aiSettingsScreen.backupApiKeys')}
            description={getString('aiSettingsScreen.backupApiKeysDesc')}
            value={backupApiKeys}
            onPress={() => {
              setAppSettings({ backupApiKeys: !backupApiKeys });
            }}
            theme={theme}
          />
        </List.Section>

        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.llmTranslationStability')}
          </List.SubHeader>

          <SwitchItem
            label={getString('aiSettingsScreen.chunkingEnabled')}
            description={getString('aiSettingsScreen.chunkingEnabledDesc')}
            value={llmChunkingEnabled}
            onPress={() =>
              setTranslateSettings({
                llmChunkingEnabled: !llmChunkingEnabled,
              })
            }
            theme={theme}
          />

          {llmChunkingEnabled && (
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.onSurface }]}>
                {getString(
                  'aiSettingsScreen.chunkWordLimit',
                  chunkWordLimitConfig,
                )}
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    color: theme.onSurface,
                    borderColor: theme.outline,
                    backgroundColor: theme.surfaceVariant,
                  },
                ]}
                defaultValue={chunkWordLimitText}
                onChangeText={setChunkWordLimitText}
                onBlur={() => {
                  const num = parseInt(chunkWordLimitText, 10);
                  if (
                    !isNaN(num) &&
                    num >= chunkWordLimitConfig.min &&
                    num <= chunkWordLimitConfig.max
                  ) {
                    setTranslateSettings({ llmChunkWordLimit: num });
                  } else {
                    setChunkWordLimitText(String(llmChunkWordLimit));
                    showToast(
                      getString(
                        'aiSettingsScreen.invalidChunkWordLimit',
                        chunkWordLimitConfig,
                      ),
                    );
                  }
                }}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="4000"
                placeholderTextColor={theme.onSurfaceVariant}
              />
            </View>
          )}

          <SwitchItem
            label={getString('aiSettingsScreen.retryEnabled')}
            description={getString('aiSettingsScreen.retryEnabledDesc')}
            value={llmRetryEnabled}
            onPress={() =>
              setTranslateSettings({
                llmRetryEnabled: !llmRetryEnabled,
              })
            }
            theme={theme}
          />

          {llmRetryEnabled && (
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.onSurface }]}>
                {getString(
                  'aiSettingsScreen.retryMaxAttempts',
                  retryMaxAttemptsConfig,
                )}
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    color: theme.onSurface,
                    borderColor: theme.outline,
                    backgroundColor: theme.surfaceVariant,
                  },
                ]}
                defaultValue={retryAttemptsText}
                onChangeText={setRetryAttemptsText}
                onBlur={() => {
                  const num = parseInt(retryAttemptsText, 10);
                  if (
                    !isNaN(num) &&
                    num >= retryMaxAttemptsConfig.min &&
                    num <= retryMaxAttemptsConfig.max
                  ) {
                    setTranslateSettings({ llmRetryMaxAttempts: num });
                  } else {
                    setRetryAttemptsText(String(llmRetryMaxAttempts));
                    showToast(
                      getString(
                        'aiSettingsScreen.invalidRetryMaxAttempts',
                        retryMaxAttemptsConfig,
                      ),
                    );
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                placeholder="3"
                placeholderTextColor={theme.onSurfaceVariant}
              />
            </View>
          )}
        </List.Section>
      </KeyboardAwareScrollView>

      <AIProviderModal
        visible={providerModalVisible}
        onDismiss={() => setProviderModalVisible(false)}
        initialProvider={providers.find(p => p.id === editingProviderId)}
        onSave={async (provider, apiKey) => {
          if (editingProviderId) {
            await updateProvider(editingProviderId, provider, apiKey);
          } else {
            await addProvider(provider, apiKey);
          }
          setProviderModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

export default SettingsAIScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 32,
  },
  addBtnContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  addBtn: {
    width: '100%',
  },
  deleteButton: {
    margin: 0,
    backgroundColor: 'transparent',
  },
  listItem: {
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputLabel: {
    fontSize: 14,
    flex: 1,
  },
  numberInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
  },
});
