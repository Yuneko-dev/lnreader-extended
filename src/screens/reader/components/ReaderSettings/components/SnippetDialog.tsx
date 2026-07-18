import { Button, KeyboardAvoidingModal, StableTextInput } from '@components';
import { useTheme } from '@hooks/persisted';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import type { CodeSnippet } from '@utils/customCode';
import { showToast } from '@utils/showToast';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { HelperText } from 'react-native-paper';

type Props = {
  visible: boolean;
  language: CodeSnippet['lang'];
  initialSnippet?: CodeSnippet;
  onDismiss: () => void;
  onSave: (snippet: CodeSnippet) => void;
};

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
      <StableTextInput
        autoCapitalize="sentences"
        error={submitted && !name.trim()}
        label={getString('customCodeSettings.snippetName')}
        mode="outlined"
        onChangeText={setName}
        value={name}
      />
      <HelperText
        type="error"
        visible={submitted && !name.trim()}
        theme={{ colors: theme }}
      >
        {getString('customCodeSettings.nameRequired')}
      </HelperText>
      <StableTextInput
        autoCapitalize="none"
        autoCorrect={false}
        error={submitted && !code.trim()}
        label={getString('customCodeSettings.snippetCode')}
        mode="outlined"
        multiline
        numberOfLines={8}
        onChangeText={setCode}
        spellCheck={false}
        style={styles.code}
        value={code}
      />
      <HelperText
        type="error"
        visible={submitted && !code.trim()}
        theme={{ colors: theme }}
      >
        {getString('customCodeSettings.codeRequired')}
      </HelperText>
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
  code: { minHeight: 180 },
  content: { gap: 4 },
});
