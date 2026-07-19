import { Button, KeyboardAvoidingModal, StableTextInput } from '@components';
import { useTheme } from '@hooks/persisted';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import type { CodeSnippet } from '@utils/customCode';
import { showToast } from '@utils/showToast';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText } from 'react-native-paper';

type Props = {
  visible: boolean;
  language: CodeSnippet['lang'];
  initialSnippet?: CodeSnippet;
  onDismiss: () => void;
  onSave: (snippet: CodeSnippet) => void;
};

const customCSSPlaceholder = `/* Custom CSS for your reader */

body {
  margin: 16px;
  line-height: 1.8;
}

h1, h2, h3 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

p {
  text-indent: 1em;
  margin-bottom: 1em;
}

/* Target specific sources */
#sourceId-example {
  font-family: serif;
}`;

const customJSPlaceholder = `// Custom JavaScript for your reader
// Available variables:
// - html, novelName, chapterName
// - sourceId, chapterId, novelId

// Example: Remove elements
document.querySelectorAll('.ads').forEach(el => el.remove());

// Example: Modify content
const title = document.querySelector('h1');
if (title) {
  title.style.color = '#FF6B6B';
}`;

const SnippetDialog = ({
  visible,
  language,
  initialSnippet,
  onDismiss,
  onSave,
}: Props) => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputTheme = {
    colors: {
      background: theme.surface,
      error: theme.error,
      onSurface: theme.onSurface,
      onSurfaceVariant: theme.onSurfaceVariant,
      outline: theme.outline,
      primary: theme.primary,
    },
  };

  useEffect(() => {
    if (visible) {
      setName(initialSnippet?.name ?? '');
      setCode(initialSnippet?.code ?? '');
      setSubmitted(false);
    }
  }, [initialSnippet, visible]);

  const importFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: '*/*',
      });
      const asset = result.assets?.[0];
      if (!asset) return;

      if (!asset.name.toLowerCase().endsWith(`.${language}`)) {
        showToast(
          getString('readerSettings.invalidCodeFile', {
            extension: language.toUpperCase(),
          }),
        );
        return;
      }

      const tempPath = `${
        NativeFile.getConstants().ExternalCachesDirectoryPath
      }/imported_custom.${language}`;
      NativeFile.copyFile(asset.uri, tempPath);
      const importedCode = NativeFile.readFile(tempPath);
      NativeFile.unlink(tempPath);
      setCode(importedCode);
      showToast(getString('readerSettings.imported'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  const save = () => {
    setSubmitted(true);
    if (!name.trim() || !code.trim()) return false;

    onSave({
      name: name.trim(),
      code,
      lang: language,
      active: initialSnippet?.active ?? true,
    });
    return true;
  };

  return (
    <KeyboardAvoidingModal
      contentContainerStyle={styles.content}
      onConfirm={save}
      onDismiss={onDismiss}
      title={getString(
        initialSnippet
          ? 'customCodeSettings.editSnippet'
          : 'customCodeSettings.addSnippet',
      )}
      visible={visible}
    >
      <View>
        <StableTextInput
          autoCapitalize="sentences"
          error={submitted && !name.trim()}
          label={getString('customCodeSettings.snippetName')}
          mode="outlined"
          onChangeText={setName}
          style={styles.input}
          textColor={theme.onSurface}
          theme={inputTheme}
          value={name}
        />
        {submitted && !name.trim() ? (
          <HelperText type="error" visible theme={{ colors: theme }}>
            {getString('customCodeSettings.nameRequired')}
          </HelperText>
        ) : null}
      </View>
      <View>
        <StableTextInput
          error={submitted && !code.trim()}
          label={getString('customCodeSettings.snippetCode')}
          mode="outlined"
          multiline
          numberOfLines={12}
          onChangeText={setCode}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          style={[styles.code, { backgroundColor: theme.surface2 }]}
          contentStyle={styles.codeContent}
          activeUnderlineColor={theme.primary}
          textColor={theme.onSurface}
          placeholderTextColor={theme.onSurfaceVariant}
          theme={inputTheme}
          value={code}
          placeholder={
            language === 'css' ? customCSSPlaceholder : customJSPlaceholder
          }
        />
        {submitted && !code.trim() ? (
          <HelperText type="error" visible theme={{ colors: theme }}>
            {getString('customCodeSettings.codeRequired')}
          </HelperText>
        ) : null}
      </View>
      <Button
        icon="file-import-outline"
        mode="outlined"
        onPress={importFile}
        title={getString('readerSettings.import')}
      />
    </KeyboardAvoidingModal>
  );
};

export default React.memo(SnippetDialog);

const styles = StyleSheet.create({
  code: {
    minHeight: 180,
  },
  codeContent: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  content: { gap: 16 },
  input: { backgroundColor: 'transparent' },
});
