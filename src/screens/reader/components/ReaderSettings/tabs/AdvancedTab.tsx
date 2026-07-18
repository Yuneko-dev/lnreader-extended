import {
  Button,
  ConfirmationDialog,
  SegmentedControl,
  StableTextInput,
} from '@components';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useBoolean } from '@hooks';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';

type CodeType = 'css' | 'js';

const AdvancedTab = () => {
  const theme = useTheme();
  const settings = useChapterReaderSettings();
  const [type, setType] = useState<CodeType>('css');
  const [css, setCSS] = useState(settings.customCSS);
  const [js, setJS] = useState(settings.customJS);
  const resetDialog = useBoolean();
  useEffect(() => setCSS(settings.customCSS), [settings.customCSS]);
  useEffect(() => setJS(settings.customJS), [settings.customJS]);
  const value = type === 'css' ? css : js;
  const setValue = type === 'css' ? setCSS : setJS;

  const save = () => {
    settings.setChapterReaderSettings(
      type === 'css' ? { customCSS: css } : { customJS: js },
    );
    showToast(getString('readerSettings.saved'));
  };
  const reset = () => {
    setValue('');
    settings.setChapterReaderSettings(
      type === 'css' ? { customCSS: '' } : { customJS: '' },
    );
    resetDialog.setFalse();
  };
  const importFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: '*/*',
      });
      const asset = result.assets?.[0];
      if (!asset) return;
      if (!asset.name.toLowerCase().endsWith(`.${type}`)) {
        showToast(
          getString('readerSettings.invalidCodeFile', {
            extension: type.toUpperCase(),
          }),
        );
        return;
      }
      const path = `${
        NativeFile.getConstants().ExternalCachesDirectoryPath
      }/reader_custom.${type}`;
      NativeFile.copyFile(asset.uri, path);
      const content = NativeFile.readFile(path).trim();
      NativeFile.unlink(path);
      setValue(content);
      settings.setChapterReaderSettings(
        type === 'css' ? { customCSS: content } : { customJS: content },
      );
      showToast(getString('readerSettings.imported'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segment}>
          <SegmentedControl
            options={[
              { label: 'CSS', value: 'css' },
              { label: 'JS', value: 'js' },
            ]}
            onChange={setType}
            showCheckIcon={false}
            theme={theme}
            value={type}
          />
        </View>
        <StableTextInput
          autoCapitalize="none"
          autoCorrect={false}
          contentStyle={styles.editorContent}
          mode="outlined"
          multiline
          numberOfLines={12}
          onChangeText={setValue}
          placeholder={
            type === 'css' ? '/* Custom CSS */' : '// Custom JavaScript'
          }
          render={props => (
            <BottomSheetTextInput
              {...(props as React.ComponentProps<typeof BottomSheetTextInput>)}
            />
          )}
          spellCheck={false}
          style={styles.editor}
          theme={{ colors: { ...theme } }}
          value={value}
        />
        <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
          {getString(
            type === 'css' ? 'readerSettings.cssHint' : 'readerSettings.jsHint',
          )}
        </Text>
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={importFile}
            style={styles.action}
            title={getString('readerSettings.import')}
          />
          <Button
            disabled={!value}
            mode="outlined"
            onPress={resetDialog.setTrue}
            style={styles.action}
            title={getString('common.reset')}
          />
          <Button
            mode="contained"
            onPress={save}
            style={styles.action}
            title={getString('common.save')}
          />
        </View>
      </BottomSheetScrollView>
      <Portal>
        <ConfirmationDialog
          onDismiss={resetDialog.setFalse}
          onSubmit={reset}
          theme={theme}
          title={getString(
            type === 'css'
              ? 'readerSettings.clearCustomCSS'
              : 'readerSettings.clearCustomJS',
          )}
          visible={resetDialog.value}
        />
      </Portal>
    </>
  );
};

export default AdvancedTab;

const styles = StyleSheet.create({
  action: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  content: { padding: 16, paddingBottom: 32 },
  editor: { minHeight: 280 },
  editorContent: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  segment: { marginBottom: 16 },
});
