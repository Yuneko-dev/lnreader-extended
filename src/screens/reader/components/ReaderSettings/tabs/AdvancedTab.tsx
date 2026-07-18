import { ConfirmationDialog, SwitchItem } from '@components';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import type { ThemeColors } from '@theme/types';
import type { CodeSnippet, RegexReplacement } from '@utils/customCode';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';

import CustomCodeCard from '../components/CustomCodeCard';
import RegexDialog from '../components/RegexDialog';
import SnippetDialog from '../components/SnippetDialog';

type SnippetEditor = {
  language: CodeSnippet['lang'];
  index?: number;
};

type RegexEditor = { index?: number };

type DeleteTarget =
  | { kind: 'regex'; index: number }
  | { kind: 'snippet'; language: CodeSnippet['lang']; index: number };

type SectionHeaderProps = {
  icon: string;
  title: string;
  addLabel: string;
  onAdd: () => void;
  theme: ThemeColors;
};

const SectionHeader = ({
  icon,
  title,
  addLabel,
  onAdd,
  theme,
}: SectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIcon}>
      <Icon source={icon} color={theme.onSurfaceVariant} size={24} />
    </View>
    <Text
      variant="titleMedium"
      style={[styles.sectionTitle, { color: theme.onSurface }]}
    >
      {title}
    </Text>
    <IconButton
      accessibilityLabel={addLabel}
      icon="plus"
      iconColor={theme.onSurface}
      onPress={onAdd}
      size={24}
    />
  </View>
);

const AdvancedTab = () => {
  const theme = useTheme();
  const settings = useChapterReaderSettings();
  const [snippetEditor, setSnippetEditor] = useState<SnippetEditor>();
  const [regexEditor, setRegexEditor] = useState<RegexEditor>();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();

  const setRegexReplacements = (regexReplacements: RegexReplacement[]) =>
    settings.setChapterReaderSettings({ regexReplacements });

  const setSnippets = (
    language: CodeSnippet['lang'],
    snippets: CodeSnippet[],
  ) =>
    settings.setChapterReaderSettings(
      language === 'css'
        ? { codeSnippetsCSS: snippets }
        : { codeSnippetsJS: snippets },
    );

  const getSnippets = (language: CodeSnippet['lang']) =>
    language === 'css' ? settings.codeSnippetsCSS : settings.codeSnippetsJS;

  const toggleRegex = (index: number) =>
    setRegexReplacements(
      settings.regexReplacements.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, active: !rule.active } : rule,
      ),
    );

  const toggleSnippet = (language: CodeSnippet['lang'], index: number) => {
    const snippets = getSnippets(language);
    setSnippets(
      language,
      snippets.map((snippet, snippetIndex) =>
        snippetIndex === index
          ? { ...snippet, active: !snippet.active }
          : snippet,
      ),
    );
  };

  const saveRegex = (rule: RegexReplacement) => {
    const index = regexEditor?.index;
    const nextRules = [...settings.regexReplacements];
    if (index === undefined) nextRules.push(rule);
    else nextRules[index] = rule;
    setRegexReplacements(nextRules);
    setRegexEditor(undefined);
  };

  const saveSnippet = (snippet: CodeSnippet) => {
    if (!snippetEditor) return;
    const snippets = [...getSnippets(snippetEditor.language)];
    if (snippetEditor.index === undefined) snippets.push(snippet);
    else snippets[snippetEditor.index] = snippet;
    setSnippets(snippetEditor.language, snippets);
    setSnippetEditor(undefined);
  };

  const deleteSelected = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'regex') {
      setRegexReplacements(
        settings.regexReplacements.filter(
          (_, index) => index !== deleteTarget.index,
        ),
      );
    } else {
      setSnippets(
        deleteTarget.language,
        getSnippets(deleteTarget.language).filter(
          (_, index) => index !== deleteTarget.index,
        ),
      );
    }
  };

  const renderSnippetSection = (language: CodeSnippet['lang']) => {
    const snippets = getSnippets(language);
    const title = getString(
      language === 'css'
        ? 'customCodeSettings.cssSnippets'
        : 'customCodeSettings.javascriptSnippets',
    );

    return (
      <View style={styles.section}>
        <SectionHeader
          addLabel={getString('customCodeSettings.addSnippet')}
          icon="code-tags"
          onAdd={() => setSnippetEditor({ language })}
          theme={theme}
          title={title}
        />
        {snippets.length ? (
          snippets.map((snippet, index) => (
            <CustomCodeCard
              key={`${language}-${index}-${snippet.name}`}
              active={snippet.active}
              deleteLabel={getString('customCodeSettings.deleteSnippetAction')}
              description={getString(
                snippet.active
                  ? 'customCodeSettings.enabled'
                  : 'customCodeSettings.disabled',
              )}
              editLabel={getString('customCodeSettings.editSnippetAction')}
              onDelete={() =>
                setDeleteTarget({ kind: 'snippet', language, index })
              }
              onEdit={() => setSnippetEditor({ language, index })}
              onToggle={() => toggleSnippet(language, index)}
              theme={theme}
              title={snippet.name}
            />
          ))
        ) : (
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.onSurfaceVariant }]}
          >
            {getString('customCodeSettings.noSnippets')}
          </Text>
        )}
      </View>
    );
  };

  const initialSnippet = snippetEditor
    ? getSnippets(snippetEditor.language)[snippetEditor.index ?? -1]
    : undefined;
  const initialRule =
    regexEditor?.index === undefined
      ? undefined
      : settings.regexReplacements[regexEditor.index];

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SectionHeader
            addLabel={getString('customCodeSettings.addRegexRule')}
            icon="find-replace"
            onAdd={() => setRegexEditor({})}
            theme={theme}
            title={getString('customCodeSettings.regexFindReplace')}
          />
          {settings.regexReplacements.length ? (
            settings.regexReplacements.map((rule, index) => (
              <CustomCodeCard
                key={`${index}-${rule.title}`}
                active={rule.active}
                deleteLabel={getString('customCodeSettings.deleteRule')}
                description={getString(
                  rule.active
                    ? 'customCodeSettings.enabled'
                    : 'customCodeSettings.disabled',
                )}
                detail={`/${rule.pattern}/${rule.flags} → ${
                  rule.replacement || getString('customCodeSettings.remove')
                }`}
                editLabel={getString('customCodeSettings.editRule')}
                onDelete={() => setDeleteTarget({ kind: 'regex', index })}
                onEdit={() => setRegexEditor({ index })}
                onToggle={() => toggleRegex(index)}
                showDetail
                theme={theme}
                title={rule.title}
              />
            ))
          ) : (
            <Text
              variant="bodyMedium"
              style={[styles.empty, { color: theme.onSurfaceVariant }]}
            >
              {getString('customCodeSettings.noRegexRules')}
            </Text>
          )}
        </View>

        <View style={styles.switches}>
          <SwitchItem
            description={getString('customCodeSettings.pluginCSSDescription')}
            label={getString('customCodeSettings.pluginCSS')}
            onPress={() =>
              settings.setChapterReaderSettings({
                pluginUseCustomCSS: !settings.pluginUseCustomCSS,
              })
            }
            theme={theme}
            value={settings.pluginUseCustomCSS}
          />
          <SwitchItem
            description={getString('customCodeSettings.pluginJSDescription')}
            label={getString('customCodeSettings.pluginJS')}
            onPress={() =>
              settings.setChapterReaderSettings({
                pluginUseCustomJS: !settings.pluginUseCustomJS,
              })
            }
            theme={theme}
            value={settings.pluginUseCustomJS}
          />
        </View>

        {renderSnippetSection('css')}
        {renderSnippetSection('js')}
      </BottomSheetScrollView>

      <RegexDialog
        initialRule={initialRule}
        onDismiss={() => setRegexEditor(undefined)}
        onSave={saveRegex}
        visible={regexEditor !== undefined}
      />
      <SnippetDialog
        initialSnippet={initialSnippet}
        language={snippetEditor?.language ?? 'css'}
        onDismiss={() => setSnippetEditor(undefined)}
        onSave={saveSnippet}
        visible={snippetEditor !== undefined}
      />
      <ConfirmationDialog
        message={getString('customCodeSettings.deleteMessage')}
        onDismiss={() => setDeleteTarget(undefined)}
        onSubmit={deleteSelected}
        theme={theme}
        title={getString('customCodeSettings.deleteTitle')}
        visible={deleteTarget !== undefined}
      />
    </>
  );
};

export default AdvancedTab;

const styles = StyleSheet.create({
  content: { paddingBottom: 32, paddingHorizontal: 16, paddingTop: 8 },
  empty: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  section: { marginBottom: 16 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  sectionIcon: { marginEnd: 12 },
  sectionTitle: { flex: 1 },
  switches: { marginBottom: 16, marginHorizontal: -16 },
});
