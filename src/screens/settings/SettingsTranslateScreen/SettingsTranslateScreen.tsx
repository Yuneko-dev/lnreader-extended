import {
  Appbar,
  Button,
  List,
  SafeAreaView,
  SegmentedControl,
} from '@components';
import type { SegmentedControlOption } from '@components/SegmentedControl';
import { useTheme } from '@hooks/persisted';
import { useAIProviders } from '@hooks/persisted/useAIProviders';
import {
  type TranslateSettings,
  useTranslateSettings,
} from '@hooks/persisted/useSettings';
import type { TranslateSettingsScreenProps } from '@navigators/types';
import {
  supportedLanguagesList,
  targetSupportedLanguagesList,
} from '@services/translate/TranslateEngine';
import { getString } from '@strings/translations';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import SettingSwitch from '../components/SettingSwitch';
import LLMTranslationStabilitySection from './components/LLMTranslationStabilitySection';
import SelectionModal, {
  type SelectionOption,
} from './components/SelectionModal';

type SelectionKind = 'source' | 'target' | 'provider' | 'prompt';

const SettingsTranslateScreen = ({
  navigation,
}: TranslateSettingsScreenProps) => {
  const theme = useTheme();
  const {
    activeSystemPromptId,
    autoTranslateNextChapter,
    downloadTranslated,
    engine,
    llmSystemPrompts,
    setTranslateSettings,
    sourceLang,
    targetLang,
  } = useTranslateSettings();
  const { activeProvider, activeProviderId, providers, setActiveProviderId } =
    useAIProviders();
  const [selectionKind, setSelectionKind] = useState<SelectionKind | null>(
    null,
  );

  const activePrompt = llmSystemPrompts.find(
    prompt => prompt.id === activeSystemPromptId,
  );

  const engineOptions: SegmentedControlOption<TranslateSettings['engine']>[] = [
    {
      label: getString('readerScreen.bottomSheet.translateTab.googleFree'),
      value: 'google-free',
    },
    {
      label: getString('readerScreen.bottomSheet.translateTab.llmAPI'),
      value: 'llm',
    },
  ];

  const selectionOptions = useMemo<SelectionOption[]>(() => {
    switch (selectionKind) {
      case 'source':
        return supportedLanguagesList;
      case 'target':
        return targetSupportedLanguagesList;
      case 'provider':
        return providers.map(provider => ({
          description: provider.model
            ? `${provider.provider} • ${provider.model}`
            : provider.provider,
          label: provider.alias,
          value: provider.id,
        }));
      case 'prompt':
        return llmSystemPrompts.map(prompt => ({
          label: prompt.title,
          value: prompt.id,
        }));
      default:
        return [];
    }
  }, [llmSystemPrompts, providers, selectionKind]);

  const selectionTitle = (() => {
    switch (selectionKind) {
      case 'source':
        return getString(
          'readerScreen.bottomSheet.translateTab.sourceLanguage',
        );
      case 'target':
        return getString(
          'readerScreen.bottomSheet.translateTab.targetLanguage',
        );
      case 'provider':
        return getString('aiSettingsScreen.activeProvider');
      case 'prompt':
        return getString('aiSettingsScreen.systemPrompt');
      default:
        return '';
    }
  })();

  const currentSelection = (() => {
    switch (selectionKind) {
      case 'source':
        return sourceLang;
      case 'target':
        return targetLang;
      case 'provider':
        return activeProviderId;
      case 'prompt':
        return activeSystemPromptId;
      default:
        return undefined;
    }
  })();

  const emptySelectionMessage =
    selectionKind === 'provider'
      ? getString('aiSettingsScreen.noProvidersConfigured')
      : selectionKind === 'prompt'
      ? getString('translateSettingsScreen.noSystemPromptsConfigured')
      : undefined;

  const getLanguageLabel = (code: string) =>
    supportedLanguagesList.find(language => language.value === code)?.label ||
    code;

  const handleSelection = (value: string) => {
    switch (selectionKind) {
      case 'source':
        setTranslateSettings({ sourceLang: value });
        break;
      case 'target':
        setTranslateSettings({ targetLang: value });
        break;
      case 'provider':
        setActiveProviderId(value);
        break;
      case 'prompt':
        setTranslateSettings({ activeSystemPromptId: value });
        break;
    }
  };

  return (
    <SafeAreaView excludeTop>
      <Appbar
        handleGoBack={navigation.goBack}
        theme={theme}
        title={getString('translateSettings')}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('translateSettingsScreen.engineSection')}
          </List.SubHeader>
          <View style={styles.segmentedControlContainer}>
            <SegmentedControl
              onChange={value => setTranslateSettings({ engine: value })}
              options={engineOptions}
              theme={theme}
              value={engine}
            />
          </View>
          <List.Divider theme={theme} />
          <List.SubHeader theme={theme}>
            {getString('translateSettingsScreen.languagesSection')}
          </List.SubHeader>
          <List.Item
            description={getLanguageLabel(sourceLang)}
            onPress={() => setSelectionKind('source')}
            right="menu-down"
            theme={theme}
            title={getString(
              'readerScreen.bottomSheet.translateTab.sourceLanguage',
            )}
          />
          <List.Item
            description={getLanguageLabel(targetLang)}
            onPress={() => setSelectionKind('target')}
            right="menu-down"
            theme={theme}
            title={getString(
              'readerScreen.bottomSheet.translateTab.targetLanguage',
            )}
          />
          <List.Divider theme={theme} />
          <List.SubHeader theme={theme}>
            {getString('translateSettingsScreen.behaviorSection')}
          </List.SubHeader>
          <SettingSwitch
            label={getString(
              'readerScreen.bottomSheet.translateTab.preTranslateNextChapter',
            )}
            onPress={() =>
              setTranslateSettings({
                autoTranslateNextChapter: !autoTranslateNextChapter,
              })
            }
            theme={theme}
            value={autoTranslateNextChapter}
          />
          <SettingSwitch
            label={getString(
              'readerScreen.bottomSheet.translateTab.downloadTranslated',
            )}
            onPress={() =>
              setTranslateSettings({
                downloadTranslated: !downloadTranslated,
              })
            }
            theme={theme}
            value={downloadTranslated}
          />
          {engine === 'llm' ? (
            <>
              <List.Divider theme={theme} />
              <List.SubHeader theme={theme}>
                {getString('translateSettingsScreen.llmSection')}
              </List.SubHeader>
              <List.Item
                description={
                  activeProvider?.alias ||
                  getString('aiSettingsScreen.noneSelected')
                }
                onPress={() => setSelectionKind('provider')}
                right="menu-down"
                theme={theme}
                title={getString('aiSettingsScreen.activeProvider')}
              />
              <View style={styles.actionContainer}>
                <Button
                  icon="cog-outline"
                  mode="outlined"
                  onPress={() => navigation.navigate('AISettings')}
                  title={getString('translateSettingsScreen.manageProviders')}
                />
              </View>
              <List.Item
                description={
                  activePrompt?.title ||
                  getString('aiSettingsScreen.noneSelected')
                }
                onPress={() => setSelectionKind('prompt')}
                right="menu-down"
                theme={theme}
                title={getString('aiSettingsScreen.systemPrompt')}
              />
              <View style={styles.actionContainer}>
                <Button
                  icon="text-box-edit-outline"
                  mode="outlined"
                  onPress={() => navigation.navigate('AIPromptsSettings')}
                  title={getString(
                    'translateSettingsScreen.manageSystemPrompts',
                  )}
                />
              </View>
              <LLMTranslationStabilitySection />
            </>
          ) : null}
        </List.Section>
      </KeyboardAwareScrollView>
      <SelectionModal
        currentValue={currentSelection}
        emptyMessage={emptySelectionMessage}
        onDismiss={() => setSelectionKind(null)}
        onSelect={handleSelection}
        options={selectionOptions}
        title={selectionTitle}
        visible={selectionKind !== null}
      />
    </SafeAreaView>
  );
};

export default SettingsTranslateScreen;

const styles = StyleSheet.create({
  actionContainer: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  segmentedControlContainer: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
});
