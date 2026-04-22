import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme, useTranslateSettings } from '@hooks/persisted';
import type {
  LLMProviderSupported,
  TranslateSettings,
} from '@hooks/persisted/useSettings';
import { initialTranslateSettings } from '@hooks/persisted/useSettings';
import { List, Button } from '@components/index';
import { Portal, Modal, TextInput, Menu, Switch } from 'react-native-paper';
import { supportedLanguagesList } from '@services/translate/TranslateEngine';
import { getString } from '@strings/translations';
import { LLMTranslateEngine } from '@services/translate/LLMTranslateEngine';
import { showToast } from '@utils/showToast';
import { useChapterContext } from '@screens/reader/ChapterContext';

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
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
  { label: 'xAI', value: 'xai', endpoint: 'https://api.x.ai/v1' },
  {
    label: 'OpenRouter',
    value: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1',
  },
  { label: 'Groq', value: 'groq', endpoint: 'https://api.groq.com/openai/v1' },
  { label: 'OpenAI Compatible API (Custom)', value: 'custom', endpoint: 'http://localhost:1234/v1' },
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
            <TouchableOpacity
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
            </TouchableOpacity>
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
    llmSystemPrompt,
    llmEnableReasoning,
    llmReasoningEffort,
    autoTranslateNextChapter,
    setTranslateSettings: _setTranslateSettings,
  } = useTranslateSettings();

  const { revertTranslation, isTranslated } = useChapterContext();

  React.useEffect(() => {
    if (!llmSystemPrompt || !llmSystemPrompt.trim()) {
      _setTranslateSettings({ llmSystemPrompt: initialTranslateSettings.llmSystemPrompt });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <View style={styles.row}>
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

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setSourceLangModalVisible(true)}
          >
            <Text style={[styles.label, { color: theme.onSurface }]}>
              {getString(
                'readerScreen.bottomSheet.translateTab.sourceLanguage',
              )}
            </Text>
            <Text style={[styles.value, { color: theme.onSurfaceVariant }]}>
              {getLangLabel(sourceLang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setTargetLangModalVisible(true)}
          >
            <Text style={[styles.label, { color: theme.onSurface }]}>
              {getString(
                'readerScreen.bottomSheet.translateTab.targetLanguage',
              )}
            </Text>
            <Text style={[styles.value, { color: theme.onSurfaceVariant }]}>
              {getLangLabel(targetLang)}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.settingItem,
            ]}
          >
            <Text style={[styles.label, { color: theme.onSurface }]}>
              {getString(
                'readerScreen.bottomSheet.translateTab.preTranslateNextChapter',
              )}
            </Text>
            <Switch
              value={autoTranslateNextChapter}
              onValueChange={val =>
                setTranslateSettings({ autoTranslateNextChapter: val })
              }
              color={theme.primary}
            />
          </View>

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
                  <TouchableOpacity
                    style={[styles.input, styles.dropdown]}
                    onPress={() => setProviderMenuVisible(true)}
                  >
                    <Text style={{ color: theme.onSurfaceVariant }}>
                      {getString(
                        'readerScreen.bottomSheet.translateTab.provider',
                      )}
                    </Text>
                    <Text style={{ color: theme.onSurface }}>
                      {getProviderLabel(llmProvider)}
                    </Text>
                  </TouchableOpacity>
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

              {llmProvider === 'custom' && (
                <TextInput
                  render={props => <BottomSheetTextInput {...props as any} />}
                  label={getString(
                    'readerScreen.bottomSheet.translateTab.endpointUrl',
                  )}
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
              )}
              <TextInput
                render={props => <BottomSheetTextInput {...props as any} />}
                label={getString(
                  'readerScreen.bottomSheet.translateTab.apiKey',
                )}
                value={llmApiKey}
                onChangeText={text => setTranslateSettings({ llmApiKey: text })}
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
              <View style={styles.modelRow}>
                <TextInput
                  render={props => <BottomSheetTextInput {...props as any} />}
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
                  style={{ marginLeft: 8 }}
                  loading={isLoadingModels}
                  disabled={isLoadingModels}
                />
              </View>

              <TextInput
                render={props => <BottomSheetTextInput {...props as any} />}
                label={getString(
                  'readerScreen.bottomSheet.translateTab.systemPrompt',
                )}
                value={llmSystemPrompt}
                onChangeText={text =>
                  setTranslateSettings({ llmSystemPrompt: text })
                }
                mode="outlined"
                multiline
                numberOfLines={4}
                style={[styles.input, { minHeight: 100 }]}
                theme={{
                  colors: {
                    primary: theme.primary,
                    background: theme.surface,
                    onSurface: theme.onSurface,
                    onSurfaceVariant: theme.onSurfaceVariant,
                  },
                }}
              />

              <View
                style={[
                  styles.settingItem,
                  { paddingHorizontal: 0, paddingTop: 0 },
                ]}
              >
                <Text style={{ color: theme.onSurface }}>Enable Reasoning</Text>
                <Switch
                  value={llmEnableReasoning}
                  onValueChange={val =>
                    setTranslateSettings({ llmEnableReasoning: val })
                  }
                  color={theme.primary}
                />
              </View>

              {llmEnableReasoning && (
                <Menu
                  visible={reasoningEffortMenuVisible}
                  onDismiss={() => setReasoningEffortMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={[styles.input, styles.dropdown]}
                      onPress={() => setReasoningEffortMenuVisible(true)}
                    >
                      <Text style={{ color: theme.onSurfaceVariant }}>
                        Reasoning Effort
                      </Text>
                      <Text style={{ color: theme.onSurface }}>
                        {llmReasoningEffort || 'low'}
                      </Text>
                    </TouchableOpacity>
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
              <TouchableOpacity
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
              </TouchableOpacity>
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
  row: {
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
  llmConfigSection: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#79747e', // rough outline
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
