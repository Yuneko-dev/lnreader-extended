import { Button, List, SwitchItem } from '@components';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@hooks/persisted';
import { useAIProviders } from '@hooks/persisted/useAIProviders';
import { useTranslateSettings } from '@hooks/persisted/useSettings';
import {
  supportedLanguagesList,
  targetSupportedLanguagesList,
} from '@services/translate/TranslateEngine';
import { getString } from '@strings/translations';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';

interface LanguagePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (langCode: string) => void;
  currentLang: string;
  languages: typeof supportedLanguagesList;
}

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  visible,
  onDismiss,
  onSelect,
  currentLang,
  languages,
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
          {languages.map(lang => (
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

interface ProviderPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (providerId: string) => void;
  currentProviderId: string | null | undefined;
  providers: any[];
}

const ProviderPickerModal: React.FC<ProviderPickerModalProps> = ({
  visible,
  onDismiss,
  onSelect,
  currentProviderId,
  providers,
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
          {getString('aiSettingsScreen.activeProvider')}
        </Text>
        <ScrollView style={styles.languageList}>
          {providers.map(p => (
            <Pressable
              key={p.id}
              style={[
                styles.languageItem,
                currentProviderId === p.id && {
                  backgroundColor: theme.surfaceVariant,
                },
              ]}
              onPress={() => {
                onSelect(p.id);
                onDismiss();
              }}
            >
              <View>
                <Text
                  style={[styles.languageItemText, { color: theme.onSurface }]}
                >
                  {p.alias}
                </Text>
                <Text
                  style={[styles.infoText, { color: theme.onSurfaceVariant }]}
                >
                  {p.provider}
                </Text>
              </View>
              {currentProviderId === p.id && (
                <Text style={[styles.checkIcon, { color: theme.primary }]}>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
          {providers.length === 0 && (
            <Text style={[styles.padding, { color: theme.onSurfaceVariant }]}>
              {getString('aiSettingsScreen.noProvidersConfigured')}
            </Text>
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

interface PromptPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (promptId: string) => void;
  currentPromptId: string | null | undefined;
  prompts: any[];
}

const PromptPickerModal: React.FC<PromptPickerModalProps> = ({
  visible,
  onDismiss,
  onSelect,
  currentPromptId,
  prompts,
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
          {getString('aiSettingsScreen.systemPrompt')}
        </Text>
        <ScrollView style={styles.languageList}>
          {prompts.map(p => (
            <Pressable
              key={p.id}
              style={[
                styles.languageItem,
                currentPromptId === p.id && {
                  backgroundColor: theme.surfaceVariant,
                },
              ]}
              onPress={() => {
                onSelect(p.id);
                onDismiss();
              }}
            >
              <View>
                <Text
                  style={[styles.languageItemText, { color: theme.onSurface }]}
                >
                  {p.title}
                </Text>
              </View>
              {currentPromptId === p.id && (
                <Text style={[styles.checkIcon, { color: theme.primary }]}>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
          {prompts.length === 0 && (
            <Text style={[styles.padding, { color: theme.onSurfaceVariant }]}>
              No system prompts configured
            </Text>
          )}
        </ScrollView>
        <Button
          title={getString('common.cancel')}
          mode="outlined"
          onPress={onDismiss}
          style={styles.cancelButton}
        />
      </Modal>
    </Portal>
  );
};

const TranslateTab: React.FC = () => {
  const theme = useTheme();
  const {
    engine,
    sourceLang,
    targetLang,
    llmSystemPrompts,
    activeSystemPromptId,
    autoTranslateNextChapter,
    downloadTranslated,
    setTranslateSettings,
  } = useTranslateSettings();

  const { providers, activeProviderId, setActiveProviderId } = useAIProviders();

  const [sourceLangModalVisible, setSourceLangModalVisible] = useState(false);
  const [targetLangModalVisible, setTargetLangModalVisible] = useState(false);
  const [providerMenuVisible, setProviderMenuVisible] = useState(false);
  const [promptManagerVisible, setPromptManagerVisible] = useState(false);

  const getLangLabel = (code: string) => {
    return supportedLanguagesList.find(l => l.value === code)?.label || code;
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

              <List.Item
                title={getString('aiSettingsScreen.activeProvider')}
                description={(() => {
                  const p = providers.find(x => x.id === activeProviderId);
                  return p
                    ? p.alias
                    : getString('aiSettingsScreen.noneSelected');
                })()}
                onPress={() => setProviderMenuVisible(true)}
                theme={theme}
              />

              <List.Item
                title={getString('aiSettingsScreen.systemPrompt')}
                description={
                  llmSystemPrompts?.find(p => p.id === activeSystemPromptId)
                    ?.title || 'Default'
                }
                onPress={() => setPromptManagerVisible(true)}
                theme={theme}
              />
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
        languages={supportedLanguagesList}
      />
      <LanguagePickerModal
        visible={targetLangModalVisible}
        onDismiss={() => setTargetLangModalVisible(false)}
        onSelect={lang => setTranslateSettings({ targetLang: lang })}
        currentLang={targetLang}
        languages={targetSupportedLanguagesList}
      />

      <ProviderPickerModal
        visible={providerMenuVisible}
        onDismiss={() => setProviderMenuVisible(false)}
        onSelect={id => setActiveProviderId(id)}
        currentProviderId={activeProviderId}
        providers={providers}
      />

      <PromptPickerModal
        visible={promptManagerVisible}
        onDismiss={() => setPromptManagerVisible(false)}
        prompts={llmSystemPrompts}
        currentPromptId={activeSystemPromptId}
        onSelect={id => setTranslateSettings({ activeSystemPromptId: id })}
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
  modelInput: {
    fontSize: 16,
    marginBottom: 8,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  providerBtn: {
    flex: 1,
  },
  loadModelsBtn: {
    marginLeft: 8,
    marginTop: 6,
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
  infoText: {
    fontSize: 12,
  },
  padding: {
    padding: 12,
  },
});
