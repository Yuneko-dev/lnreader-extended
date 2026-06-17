import { Button, SwitchItem } from '@components/index';
import { useTheme } from '@hooks/persisted';
import { type AIProvider, getApiKey } from '@hooks/persisted/useAIProviders';
import type { LLMProviderSupported, LLMReasoningEffortType } from '@hooks/persisted/useSettings';
import { GeminiClient } from '@services/ai/GeminiClient';
import { OpenAIClient } from '@services/ai/OpenAIClient';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';

export interface AIProviderModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (provider: Omit<AIProvider, 'id'>, apiKey: string) => Promise<void>;
  initialProvider?: AIProvider;
}

const PROVIDERS: { label: string, value: LLMProviderSupported, endpoint: string }[] = [
  { label: 'OpenAI', value: 'openai', endpoint: 'https://api.openai.com/v1' },
  {
    label: 'DeepSeek',
    value: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1',
  },
  { label: 'Google Gemini', value: 'gemini', endpoint: '' },
  { label: 'xAI', value: 'xai', endpoint: 'https://api.x.ai/v1' },
  {
    label: 'OpenRouter',
    value: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1',
  },
  { label: 'Groq', value: 'groq', endpoint: 'https://api.groq.com/openai/v1' },
  { label: 'OpenAI Compatible (Custom)', value: 'custom', endpoint: 'http://localhost:1234/v1' },
];

const REASONING_EFFORTS: LLMReasoningEffortType[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];

const AIProviderModal: React.FC<AIProviderModalProps> = ({
  visible,
  onDismiss,
  onSave,
  initialProvider,
}) => {
  const theme = useTheme();

  const [alias, setAlias] = useState('');
  const [provider, setProvider] = useState<LLMProviderSupported>('openai');
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.6);
  const [apiMode, setApiMode] = useState<'responses' | 'chat-completions'>(
    'responses',
  );
  const [enableReasoning, setEnableReasoning] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<LLMReasoningEffortType>('low');

  const [providerMenuVisible, setProviderMenuVisible] = useState(false);
  const [apiModeMenuVisible, setApiModeMenuVisible] = useState(false);
  const [reasoningMenuVisible, setReasoningMenuVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    if (visible && initialProvider) {
      setProvider(initialProvider.provider);
      setAlias(initialProvider.alias);
      setEndpoint(initialProvider.endpoint);
      setModel(initialProvider.model);
      setTemperature(initialProvider.temperature ?? 1.0);
      setApiMode(initialProvider.apiMode ?? 'responses');
      setEnableReasoning(initialProvider.enableReasoning ?? false);
      setReasoningEffort(initialProvider.reasoningEffort ?? 'none');

      getApiKey(initialProvider.id).then(key => {
        if (mounted && key) {
          setApiKey(key);
          setInputKey(k => k + 1);
        }
      });
    } else if (visible && !initialProvider) {
      setProvider('openai');
      setAlias('LLM');
      setEndpoint('https://api.openai.com/v1');
      setModel('');
      setApiKey('');
      setTemperature(1.0);
      setApiMode('chat-completions');
      setEnableReasoning(false);
      setReasoningEffort('none');
      setInputKey(k => k + 1);
    }

    return () => {
      mounted = false;
    };
  }, [visible, initialProvider]);

  const handleSave = async () => {
    if (!alias) {
      showToast('Alias is required');
      return;
    }
    if (!apiKey && !initialProvider) {
      showToast('API Key is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          alias,
          provider,
          endpoint,
          model,
          temperature,
          apiMode,
          enableReasoning,
          reasoningEffort,
        },
        apiKey,
      );
      onDismiss();
    } catch (e: any) {
      showToast(`Error saving provider: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getProviderLabel = (val: string) => {
    return PROVIDERS.find(p => p.value === val)?.label || val;
  };

  const loadModels = async () => {
    if (!apiKey) {
      showToast('API Key is required to fetch models');
      return;
    }
    try {
      setIsLoadingModels(true);
      const client =
        provider === 'gemini'
          ? new GeminiClient({ endpoint, apiKey, model: '' })
          : new OpenAIClient({ endpoint, apiKey, model: '' });

      const models = await client.fetchModels();
      if (!models || models.length === 0) {
        showToast('No models found');
        return;
      }
      setAvailableModels(models);
      setModelPickerVisible(true);
    } catch (e: any) {
      showToast(`Failed to load models: ${e.message}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

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
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
            {initialProvider
              ? getString('aiSettingsScreen.editProvider')
              : getString('aiSettingsScreen.addProvider')}
          </Text>

          <TextInput
            key={`alias-${inputKey}`}
            label={getString(
              'aiSettingsScreen.aiProviderModal.aliasPlaceholder',
            )}
            defaultValue={alias}
            onChangeText={setAlias}
            mode="outlined"
            style={styles.input}
            textColor={theme.onSurface}
            theme={{
              colors: {
                primary: theme.primary,
                background: theme.surface,
                onSurfaceVariant: theme.onSurfaceVariant,
              },
            }}
          />

          <View style={styles.dropdownContainer}>
            <Text
              style={[styles.dropdownLabel, { color: theme.onSurfaceVariant }]}
            >
              {getString('readerScreen.bottomSheet.translateTab.provider')}
            </Text>
            <Menu
              visible={providerMenuVisible}
              onDismiss={() => setProviderMenuVisible(false)}
              contentStyle={{ backgroundColor: theme.surface }}
              anchor={
                <Pressable
                  style={[styles.dropdown, { borderColor: theme.outline }]}
                  onPress={() => setProviderMenuVisible(true)}
                >
                  <Text
                    style={[styles.dropdownText, { color: theme.onSurface }]}
                    numberOfLines={1}
                  >
                    {getProviderLabel(provider)}
                  </Text>
                  <Text
                    style={[
                      styles.dropdownIcon,
                      { color: theme.onSurfaceVariant },
                    ]}
                  >
                    ▼
                  </Text>
                </Pressable>
              }
            >
              {PROVIDERS.map(p => (
                <Menu.Item
                  key={p.value}
                  title={p.label}
                  titleStyle={{ color: theme.onSurface }}
                  onPress={() => {
                    setProvider(p.value);
                    setEndpoint(p.endpoint);
                    setProviderMenuVisible(false);
                    setInputKey(k => k + 1);
                  }}
                />
              ))}
            </Menu>
          </View>

          <TextInput
            key={`endpoint-${inputKey}`}
            label={getString('aiSettingsScreen.endpointUrl')}
            defaultValue={endpoint}
            onChangeText={setEndpoint}
            mode="outlined"
            readOnly={!['custom', 'gemini'].includes(provider)}
            style={styles.input}
            textColor={theme.onSurface}
            theme={{
              colors: {
                primary: theme.primary,
                background: theme.surface,
                onSurfaceVariant: theme.onSurfaceVariant,
              },
            }}
          />

          <TextInput
            key={`apiKey-${inputKey}`}
            label={getString('aiSettingsScreen.apiKey')}
            defaultValue={apiKey}
            onChangeText={setApiKey}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            textColor={theme.onSurface}
            theme={{
              colors: {
                primary: theme.primary,
                background: theme.surface,
                onSurfaceVariant: theme.onSurfaceVariant,
              },
            }}
          />

          <View style={styles.modelRow}>
            <TextInput
              key={`model-${inputKey}`}
              label={getString('aiSettingsScreen.modelName')}
              defaultValue={model}
              onChangeText={setModel}
              mode="outlined"
              style={[styles.input, styles.modelInput]}
              textColor={theme.onSurface}
              theme={{
                colors: {
                  primary: theme.primary,
                  background: theme.surface,
                  onSurfaceVariant: theme.onSurfaceVariant,
                },
              }}
            />
            <Button
              title={getString('aiSettingsScreen.loadModels') || 'Load models'}
              mode="contained"
              onPress={loadModels}
              style={styles.loadModelsBtn}
              loading={isLoadingModels}
              disabled={isLoadingModels}
            />
          </View>

          {provider !== 'gemini' && (
            <View style={styles.dropdownContainer}>
              <Text
                style={[
                  styles.dropdownLabel,
                  { color: theme.onSurfaceVariant },
                ]}
              >
                {getString('aiSettingsScreen.apiMode')}
              </Text>
              <Menu
                visible={apiModeMenuVisible}
                onDismiss={() => setApiModeMenuVisible(false)}
                contentStyle={{ backgroundColor: theme.surface }}
                anchor={
                  <Pressable
                    style={[styles.dropdown, { borderColor: theme.outline }]}
                    onPress={() => setApiModeMenuVisible(true)}
                  >
                    <Text
                      style={[styles.dropdownText, { color: theme.onSurface }]}
                      numberOfLines={1}
                    >
                      {apiMode}
                    </Text>
                    <Text
                      style={[
                        styles.dropdownIcon,
                        { color: theme.onSurfaceVariant },
                      ]}
                    >
                      ▼
                    </Text>
                  </Pressable>
                }
              >
                <Menu.Item
                  title="responses"
                  titleStyle={{ color: theme.onSurface }}
                  onPress={() => {
                    setApiMode('responses');
                    setApiModeMenuVisible(false);
                  }}
                />
                <Menu.Item
                  title="chat-completions"
                  titleStyle={{ color: theme.onSurface }}
                  onPress={() => {
                    setApiMode('chat-completions');
                    setApiModeMenuVisible(false);
                  }}
                />
              </Menu>
            </View>
          )}

          <SwitchItem
            label={getString(
              'aiSettingsScreen.aiProviderModal.enableReasoning',
            )}
            value={enableReasoning}
            onPress={() => setEnableReasoning(!enableReasoning)}
            theme={theme}
          />

          {enableReasoning && (
            <View style={styles.dropdownContainer}>
              <Text
                style={[
                  styles.dropdownLabel,
                  { color: theme.onSurfaceVariant },
                ]}
              >
                {getString('aiSettingsScreen.aiProviderModal.reasoningEffort')}
              </Text>
              <Menu
                visible={reasoningMenuVisible}
                onDismiss={() => setReasoningMenuVisible(false)}
                contentStyle={{ backgroundColor: theme.surface }}
                anchor={
                  <Pressable
                    style={[styles.dropdown, { borderColor: theme.outline }]}
                    onPress={() => setReasoningMenuVisible(true)}
                  >
                    <Text
                      style={[styles.dropdownText, { color: theme.onSurface }]}
                      numberOfLines={1}
                    >
                      {reasoningEffort}
                    </Text>
                    <Text
                      style={[
                        styles.dropdownIcon,
                        { color: theme.onSurfaceVariant },
                      ]}
                    >
                      ▼
                    </Text>
                  </Pressable>
                }
              >
                {REASONING_EFFORTS.map(eff => (
                  <Menu.Item
                    key={eff}
                    title={eff}
                    titleStyle={{ color: theme.onSurface }}
                    onPress={() => {
                      setReasoningEffort(eff);
                      setReasoningMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>
            </View>
          )}
        </KeyboardAwareScrollView>
        <View style={styles.footer}>
          <Button
            title={getString('common.cancel')}
            mode="text"
            onPress={onDismiss}
            style={styles.flexBtn}
          />
          <View style={styles.spacer} />
          <Button
            title={getString('common.save')}
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            style={styles.flexBtn}
            disabled={!model.trim()}
          />
        </View>
      </Modal>

      <Modal
        visible={modelPickerVisible}
        onDismiss={() => setModelPickerVisible(false)}
        contentContainerStyle={[
          styles.modalContent,
          { backgroundColor: theme.surface },
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
          Select Model
        </Text>
        <ScrollView style={styles.languageList}>
          {availableModels.map(m => (
            <Pressable
              key={m}
              style={[
                styles.languageItem,
                model === m && { backgroundColor: theme.surfaceVariant },
              ]}
              onPress={() => {
                setModel(m);
                setModelPickerVisible(false);
                setInputKey(k => k + 1);
              }}
            >
              <Text
                style={[styles.languageItemText, { color: theme.onSurface }]}
              >
                {m}
              </Text>
              {model === m && (
                <Text style={[styles.checkIcon, { color: theme.primary }]}>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
        <Button
          title={getString('common.cancel')}
          mode="outlined"
          onPress={() => setModelPickerVisible(false)}
          style={styles.cancelButton}
        />
      </Modal>
    </Portal>
  );
};

export default AIProviderModal;

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modelInput: {
    flex: 1,
    marginBottom: 0,
  },
  loadModelsBtn: {
    marginLeft: 8,
    marginTop: 6,
  },
  languageList: {
    maxHeight: 350,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  languageItemText: {
    fontSize: 16,
  },
  checkIcon: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
  },
});
