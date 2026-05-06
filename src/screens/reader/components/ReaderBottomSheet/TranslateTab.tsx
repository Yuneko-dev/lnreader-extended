import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useTheme, useTranslateSettings } from '@hooks/persisted';
import type {
  LLMProviderSupported,
  TranslateSettings,
} from '@hooks/persisted/useSettings';
import { List, Button, SwitchItem } from '@components/index';
import { Portal, Modal, TextInput, Menu } from 'react-native-paper';
import { supportedLanguagesList } from '@services/translate/TranslateEngine';
import { getString } from '@strings/translations';
import { LLMTranslateEngine } from '@services/translate/LLMTranslateEngine';
import { showToast } from '@utils/showToast';
import { useChapterContext } from '@screens/reader/ChapterContext';
import Slider from '@react-native-community/slider';
import PromptManagerModal from './PromptManagerModal';

const PROVIDERS: {
  label: string;
  value: LLMProviderSupported;
  endpoint: string;
}[] = [
  { label: 'OpenAI', value: 'openai', endpoint: 'https://api.openai.com/v1' },
  {
    label: 'DeepSeek',
    value: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1',
  },
  {
    label: 'Google Gemini',
    value: 'gemini',
    endpoint: '',
  },
  { label: 'xAI', value: 'xai', endpoint: 'https://api.x.ai/v1' },
  {
    label: 'OpenRouter',
    value: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1',
  },
  { label: 'Groq', value: 'groq', endpoint: 'https://api.groq.com/openai/v1' },
  {
    label: 'OpenAI Compatible API (Custom)',
    value: 'custom',
    endpoint: 'http://localhost:1234/v1',
  },
];

interface LanguagePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (langCode: string) => void;
  currentLang: string;
}

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  visible,
  onDismiss,
  onSelect,
  currentLang,
}) => {
  const theme = useTheme();

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
          Select Language
        </Text>
        <ScrollView style={styles.languageList}>
          {supportedLanguagesList.map(lang => (
            <Pressable
              key={lang.value}
              style={[
                styles.languageItem,
                currentLang === lang.value && {
                  backgroundColor: theme.surfaceVariant,
                },
              ]}
              onPress={() => {
                onSelect(lang.value);
                onDismiss();
              }}
            >
              <Text
                style={[styles.languageItemText, { color: theme.onSurface }]}
              >
                {lang.label}
              </Text>
              {currentLang === lang.value && (
                <Text style={[styles.checkIcon, { color: theme.primary }]}>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
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

const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];

const TranslateTab: React.FC = () => {
  const theme = useTheme();
  const {
    engine,
    sourceLang,
    targetLang,
    llmProvider,
    llmEndpoint,
    llmApiKey,
    llmModel,
    llmSystemPrompts,
    activeSystemPromptId,
    llmEnableReasoning,
    llmReasoningEffort,
    llmApiMode,
    llmTemperature,
    autoTranslateNextChapter,
    downloadTranslated,
    setTranslateSettings: _setTranslateSettings,
  } = useTranslateSettings();

  const { revertTranslation, isTranslated } = useChapterContext();

  // Wrap setTranslateSettings: when any translation-affecting setting changes,
  // revert to original text so the user doesn't end up with double-translated text.
  const setTranslateSettings = useCallback(
    (values: Parameters<typeof _setTranslateSettings>[0]) => {
      if (isTranslated) {
        revertTranslation();
      }
      _setTranslateSettings(values);
    },
    [_setTranslateSettings, isTranslated, revertTranslation],
  );

  const [sourceLangModalVisible, setSourceLangModalVisible] = useState(false);
  const [targetLangModalVisible, setTargetLangModalVisible] = useState(false);
  const [providerMenuVisible, setProviderMenuVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [reasoningEffortMenuVisible, setReasoningEffortMenuVisible] =
    useState(false);
  const [apiModeMenuVisible, setApiModeMenuVisible] = useState(false);
  const [promptManagerVisible, setPromptManagerVisible] = useState(false);

  const getLangLabel = (code: string) => {
    return supportedLanguagesList.find(l => l.value === code)?.label || code;
  };

  const getProviderLabel = (val: string) => {
    return PROVIDERS.find(p => p.value === val)?.label || val;
  };

  const loadModels = async () => {
    try {
      setIsLoadingModels(true);
      const llm = new LLMTranslateEngine({
        provider: llmProvider as any,
        endpoint: llmEndpoint,
        apiKey: llmApiKey,
        model: '',
      });
      const models = await llm.fetchModels();
      setAvailableModels(models);
      setModelPickerVisible(true);
    } catch (e: any) {
      showToast('Error: ' + e.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <>
      <BottomSheetScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <List.SubHeader theme={theme}>
            {getString(
              'readerScreen.bottomSheet.translateTab.translationSettings',
            )}
          </List.SubHeader>

          <View style={styles.engineRow}>
            <Text style={[styles.label, { color: theme.onSurface }]}>
              {getString('readerScreen.bottomSheet.translateTab.engine')}
            </Text>
            <View style={styles.buttonGroup}>
              <Button
                title={getString(
                  'readerScreen.bottomSheet.translateTab.googleFree',
                )}
                mode={engine === 'google-free' ? 'contained' : 'outlined'}
                onPress={() => setTranslateSettings({ engine: 'google-free' })}
                style={styles.flexBtn}
              />
              <View style={styles.btnSpacer} />
              <Button
                title={getString(
                  'readerScreen.bottomSheet.translateTab.llmAPI',
                )}
                mode={engine === 'llm' ? 'contained' : 'outlined'}
                onPress={() => setTranslateSettings({ engine: 'llm' })}
                style={styles.flexBtn}
              />
            </View>
          </View>

          <List.Item
            title={getString(
              'readerScreen.bottomSheet.translateTab.sourceLanguage',
            )}
            description={getLangLabel(sourceLang)}
            onPress={() => setSourceLangModalVisible(true)}
            theme={theme}
          />

          <List.Item
            title={getString(
              'readerScreen.bottomSheet.translateTab.targetLanguage',
            )}
            description={getLangLabel(targetLang)}
            onPress={() => setTargetLangModalVisible(true)}
            theme={theme}
          />

          <SwitchItem
            label={getString(
              'readerScreen.bottomSheet.translateTab.preTranslateNextChapter',
            )}
            value={autoTranslateNextChapter}
            onPress={() =>
              setTranslateSettings({
                autoTranslateNextChapter: !autoTranslateNextChapter,
              })
            }
            theme={theme}
          />

          <SwitchItem
            label={getString(
              'readerScreen.bottomSheet.translateTab.downloadTranslated',
            )}
            value={downloadTranslated}
            onPress={() =>
              setTranslateSettings({
                downloadTranslated: !downloadTranslated,
              })
            }
            theme={theme}
          />

          {engine === 'llm' && (
            <View style={styles.llmConfigSection}>
              <List.SubHeader theme={theme}>
                {getString('readerScreen.bottomSheet.translateTab.llmAPI')}{' '}
                Configuration
              </List.SubHeader>

              <Menu
                visible={providerMenuVisible}
                onDismiss={() => setProviderMenuVisible(false)}
                anchor={
                  <List.Item
                    title={getString(
                      'readerScreen.bottomSheet.translateTab.provider',
                    )}
                    description={getProviderLabel(llmProvider)}
                    onPress={() => setProviderMenuVisible(true)}
                    theme={theme}
                  />
                }
              >
                {PROVIDERS.map(p => (
                  <Menu.Item
                    key={p.value}
                    title={p.label}
                    onPress={() => {
                      const updates: Partial<TranslateSettings> = {
                        llmProvider: p.value as any,
                        llmApiKey: '', // clear apiKey on change
                      };
                      if (p.endpoint !== undefined) {
                        updates.llmEndpoint = p.endpoint; // also applies empty string for custom
                      }
                      setTranslateSettings(updates);
                      setProviderMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>

              {(llmProvider === 'custom' || llmProvider === 'gemini') && (
                <View style={styles.inputContainer}>
                  <TextInput
                    render={props => (
                      <BottomSheetTextInput {...(props as any)} />
                    )}
                    label={
                      llmProvider === 'gemini'
                        ? getString(
                            'readerScreen.bottomSheet.translateTab.baseUrlReverseProxy',
                          )
                        : getString(
                            'readerScreen.bottomSheet.translateTab.endpointUrl',
                          )
                    }
                    placeholder={
                      llmProvider === 'gemini'
                        ? getString(
                            'readerScreen.bottomSheet.translateTab.baseUrlPlaceholder',
                          )
                        : undefined
                    }
                    value={llmEndpoint}
                    onChangeText={text =>
                      setTranslateSettings({ llmEndpoint: text })
                    }
                    mode="outlined"
                    style={styles.input}
                    theme={{
                      colors: {
                        primary: theme.primary,
                        background: theme.surface,
                        onSurface: theme.onSurface,
                        onSurfaceVariant: theme.onSurfaceVariant,
                      },
                    }}
                  />
                </View>
              )}
              <View style={styles.inputContainer}>
                <TextInput
                  render={props => <BottomSheetTextInput {...(props as any)} />}
                  label={getString(
                    'readerScreen.bottomSheet.translateTab.apiKey',
                  )}
                  value={llmApiKey}
                  onChangeText={text =>
                    setTranslateSettings({ llmApiKey: text })
                  }
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                  theme={{
                    colors: {
                      primary: theme.primary,
                      background: theme.surface,
                      onSurface: theme.onSurface,
                      onSurfaceVariant: theme.onSurfaceVariant,
                    },
                  }}
                />
              </View>
              <View style={[styles.modelRow, styles.inputContainer]}>
                <TextInput
                  render={props => <BottomSheetTextInput {...(props as any)} />}
                  label={getString(
                    'readerScreen.bottomSheet.translateTab.modelName',
                  )}
                  value={llmModel}
                  onChangeText={text =>
                    setTranslateSettings({ llmModel: text })
                  }
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  theme={{
                    colors: {
                      primary: theme.primary,
                      background: theme.surface,
                      onSurface: theme.onSurface,
                      onSurfaceVariant: theme.onSurfaceVariant,
                    },
                  }}
                />
                <Button
                  title={getString(
                    'readerScreen.bottomSheet.translateTab.loadModels',
                  )}
                  mode="contained"
                  onPress={loadModels}
                  style={{ marginLeft: 8, marginTop: 6 }}
                  loading={isLoadingModels}
                  disabled={isLoadingModels}
                />
              </View>

              <List.Item
                title={getString(
                  'readerScreen.bottomSheet.translateTab.systemPrompt',
                )}
                description={
                  llmSystemPrompts?.find(p => p.id === activeSystemPromptId)
                    ?.title || 'Default'
                }
                onPress={() => setPromptManagerVisible(true)}
                theme={theme}
              />

              {llmProvider !== 'gemini' && (
                <>
                  <Menu
                    visible={apiModeMenuVisible}
                    onDismiss={() => setApiModeMenuVisible(false)}
                    anchor={
                      <List.Item
                        title={getString(
                          'readerScreen.bottomSheet.translateTab.apiMode',
                        )}
                        description={
                          llmApiMode === 'chat-completions'
                            ? getString(
                                'readerScreen.bottomSheet.translateTab.apiModeChatCompletions',
                              )
                            : getString(
                                'readerScreen.bottomSheet.translateTab.apiModeResponses',
                              )
                        }
                        onPress={() => setApiModeMenuVisible(true)}
                        theme={theme}
                      />
                    }
                  >
                    <Menu.Item
                      title={getString(
                        'readerScreen.bottomSheet.translateTab.apiModeResponses',
                      )}
                      onPress={() => {
                        setTranslateSettings({ llmApiMode: 'responses' });
                        setApiModeMenuVisible(false);
                      }}
                    />
                    <Menu.Item
                      title={getString(
                        'readerScreen.bottomSheet.translateTab.apiModeChatCompletions',
                      )}
                      onPress={() => {
                        setTranslateSettings({
                          llmApiMode: 'chat-completions',
                        });
                        setApiModeMenuVisible(false);
                      }}
                    />
                  </Menu>
                </>
              )}

              {llmProvider !== 'gemini' &&
                llmApiMode === 'chat-completions' && (
                  <View style={styles.temperatureSection}>
                    <View style={styles.temperatureHeader}>
                      <Text style={{ color: theme.onSurface }}>
                        {getString(
                          'readerScreen.bottomSheet.translateTab.temperature',
                        )}
                      </Text>
                      <Text style={{ color: theme.onSurfaceVariant }}>
                        {(llmTemperature ?? 0.6).toFixed(1)}
                      </Text>
                    </View>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={2}
                      step={0.1}
                      value={llmTemperature ?? 0.6}
                      onSlidingComplete={val =>
                        setTranslateSettings({
                          llmTemperature: Math.round(val * 10) / 10,
                        })
                      }
                      minimumTrackTintColor={theme.primary}
                      maximumTrackTintColor={theme.surfaceVariant}
                      thumbTintColor={theme.primary}
                    />
                  </View>
                )}

              {(llmProvider === 'gemini' || llmApiMode === 'responses') && (
                <>
                  <SwitchItem
                    label="Enable Reasoning"
                    value={llmEnableReasoning}
                    onPress={() =>
                      setTranslateSettings({
                        llmEnableReasoning: !llmEnableReasoning,
                      })
                    }
                    theme={theme}
                  />

                  {llmEnableReasoning && (
                    <Menu
                      visible={reasoningEffortMenuVisible}
                      onDismiss={() => setReasoningEffortMenuVisible(false)}
                      anchor={
                        <List.Item
                          title="Reasoning Effort"
                          description={llmReasoningEffort || 'low'}
                          onPress={() => setReasoningEffortMenuVisible(true)}
                          theme={theme}
                        />
                      }
                    >
                      {REASONING_EFFORTS.map(eff => (
                        <Menu.Item
                          key={eff}
                          title={eff}
                          onPress={() => {
                            setTranslateSettings({
                              llmReasoningEffort: eff as any,
                            });
                            setReasoningEffortMenuVisible(false);
                          }}
                        />
                      ))}
                    </Menu>
                  )}
                </>
              )}
            </View>
          )}
        </View>
        <View style={styles.bottomSpacing} />
      </BottomSheetScrollView>

      <LanguagePickerModal
        visible={sourceLangModalVisible}
        onDismiss={() => setSourceLangModalVisible(false)}
        onSelect={lang => setTranslateSettings({ sourceLang: lang })}
        currentLang={sourceLang}
      />
      <LanguagePickerModal
        visible={targetLangModalVisible}
        onDismiss={() => setTargetLangModalVisible(false)}
        onSelect={lang => setTranslateSettings({ targetLang: lang })}
        currentLang={targetLang}
      />

      <Portal>
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
                  llmModel === m && { backgroundColor: theme.surfaceVariant },
                ]}
                onPress={() => {
                  setTranslateSettings({ llmModel: m });
                  setModelPickerVisible(false);
                }}
              >
                <Text
                  style={[styles.languageItemText, { color: theme.onSurface }]}
                >
                  {m}
                </Text>
                {llmModel === m && (
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

      <PromptManagerModal
        visible={promptManagerVisible}
        onDismiss={() => setPromptManagerVisible(false)}
        prompts={
          llmSystemPrompts || [{ id: 'default', title: 'Default', content: '' }]
        }
        activePromptId={activeSystemPromptId || 'default'}
        onUpdatePrompts={prompts =>
          setTranslateSettings({ llmSystemPrompts: prompts })
        }
        onSelectPrompt={id =>
          setTranslateSettings({ activeSystemPromptId: id })
        }
      />
    </>
  );
};

export default React.memo(TranslateTab);

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
  label: {
    fontSize: 16,
  },
  llmConfigSection: {
    paddingTop: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomSpacing: {
    height: 48,
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
  temperatureSection: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  temperatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
