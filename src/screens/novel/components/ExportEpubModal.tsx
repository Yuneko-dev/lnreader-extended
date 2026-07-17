import { KeyboardAvoidingModal, List, StableTextInput, SwitchItem } from '@components';
import { useBoolean } from '@hooks';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { openDocumentTree } from 'react-native-saf-x';
import sanitizeFileName from 'sanitize-filename';

interface ExportEpubModalProps {
  isVisible: boolean;
  novelName?: string;
  onSubmit?: (
    uri: string,
    fileName: string,
    startChapter?: number,
    endChapter?: number,
  ) => void;
  hideModal: () => void;
}

const getDefaultFileName = (novelName?: string) =>
  sanitizeFileName(novelName?.trim() || '') || 'novel';

const getValidFileName = (fileName: string) => {
  const trimmedFileName = fileName.trim();
  const fileNameWithoutExtension = trimmedFileName.replace(/\.epub$/i, '');
  const sanitizedFileName = sanitizeFileName(fileNameWithoutExtension);

  return sanitizedFileName &&
    sanitizedFileName === fileNameWithoutExtension &&
    sanitizedFileName !== '.' &&
    sanitizedFileName !== '..'
    ? sanitizedFileName
    : undefined;
};

const ExportEpubModal: React.FC<ExportEpubModalProps> = ({
  isVisible,
  novelName,
  onSubmit: onSubmitProp,
  hideModal,
}) => {
  const theme = useTheme();
  const {
    epubLocation = '',
    epubUseAppTheme = false,
    epubUseCustomCSS = false,
    epubUseCustomJS = false,
    setChapterReaderSettings,
  } = useChapterReaderSettings();

  const [uri, setUri] = useState(epubLocation);
  const defaultFileName = React.useMemo(
    () => getDefaultFileName(novelName),
    [novelName],
  );
  const [fileName, setFileName] = useState(defaultFileName);
  const useAppTheme = useBoolean(epubUseAppTheme);
  const useCustomCSS = useBoolean(epubUseCustomCSS);
  const useCustomJS = useBoolean(epubUseCustomJS);
  const exportAll = useBoolean(true);
  const [startChapter, setStartChapter] = useState('');
  const [endChapter, setEndChapter] = useState('');

  React.useEffect(() => {
    if (isVisible) {
      setFileName(defaultFileName);
    }
  }, [defaultFileName, isVisible]);

  const onDismiss = () => {
    hideModal();
    setUri(epubLocation);
    setFileName(defaultFileName);
    exportAll.setTrue();
    setStartChapter('');
    setEndChapter('');
  };

  const onSubmit = () => {
    const validFileName = getValidFileName(fileName);
    if (!validFileName) {
      showToast(getString('novelScreen.exportEpubModal.invalidFileName'));
      return false;
    }

    if (!exportAll.value) {
      const start = parseInt(startChapter, 10);
      const end = parseInt(endChapter, 10);

      if (isNaN(start) || isNaN(end)) {
        showToast(getString('novelScreen.exportEpubModal.invalidRange'));
        return false;
      }

      if (start < 1 || end < 1) {
        showToast(getString('novelScreen.exportEpubModal.invalidRange'));
        return false;
      }

      if (start > end) {
        showToast(getString('novelScreen.exportEpubModal.startGreaterThanEnd'));
        return false;
      }
    }

    setChapterReaderSettings({
      epubLocation: uri,
      epubUseAppTheme: useAppTheme.value,
      epubUseCustomCSS: useCustomCSS.value,
      epubUseCustomJS: useCustomJS.value,
    });

    const start = exportAll.value ? undefined : parseInt(startChapter, 10);
    const end = exportAll.value ? undefined : parseInt(endChapter, 10);

    onSubmitProp?.(uri, validFileName, start, end);
  };

  const openFolderPicker = async () => {
    try {
      const resultUri = await openDocumentTree(true);
      if (resultUri) {
        setUri(resultUri.uri);
      }
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <KeyboardAvoidingModal
      visible={isVisible}
      title={getString('novelScreen.exportEpubModal.title')}
      onDismiss={onDismiss}
      onConfirm={onSubmit}
      confirmLabel={getString('common.submit')}
      contentContainerStyle={styles.scrollContent}
    >
      <View>
        <StableTextInput
          onChangeText={setUri}
          value={uri}
          readOnly={true}
          placeholder={getString('novelScreen.exportEpubModal.selectFolder')}
          mode="outlined"
          theme={{ colors: { ...theme } }}
          underlineColor={theme.outline}
          dense
          right={
            <TextInput.Icon
              icon="folder-edit-outline"
              onPress={openFolderPicker}
            />
          }
        />
        <StableTextInput
          label={getString('novelScreen.exportEpubModal.fileName') + ' (.epub)'}
          value={fileName}
          onChangeText={setFileName}
          autoCapitalize="none"
          autoCorrect={false}
          mode="outlined"
          theme={{ colors: { ...theme } }}
          underlineColor={theme.outline}
          dense
          style={styles.fileNameInput}
          maxLength={200}
        />
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={14}
            color="#ffc107"
            style={styles.warningIcon}
          />
          <Text style={[styles.warning, { color: theme.onSurfaceVariant }]}>
            {getString('novelScreen.exportEpubModal.overwriteWarning')}
          </Text>
        </View>
      </View>
      <View style={styles.settings}>
        <SwitchItem
          label={getString('novelScreen.exportEpubModal.exportAll')}
          value={exportAll.value}
          onPress={exportAll.toggle}
          theme={theme}
        />
        {!exportAll.value && (
          <View style={styles.rangeInputs}>
            <StableTextInput
              label={getString('novelScreen.exportEpubModal.startChapter')}
              value={startChapter}
              onChangeText={setStartChapter}
              keyboardType="numeric"
              mode="outlined"
              theme={{ colors: { ...theme } }}
              underlineColor={theme.outline}
              dense
              style={styles.rangeInput}
            />
            <StableTextInput
              label={getString('novelScreen.exportEpubModal.endChapter')}
              value={endChapter}
              onChangeText={setEndChapter}
              keyboardType="numeric"
              mode="outlined"
              theme={{ colors: { ...theme } }}
              underlineColor={theme.outline}
              dense
              style={styles.rangeInput}
            />
          </View>
        )}
        <SwitchItem
          label={getString('novelScreen.exportEpubModal.applyReaderTheme')}
          value={useAppTheme.value}
          onPress={useAppTheme.toggle}
          theme={theme}
        />
        <SwitchItem
          label={getString('novelScreen.exportEpubModal.includeCustomCSS')}
          value={useCustomCSS.value}
          onPress={useCustomCSS.toggle}
          theme={theme}
        />
        <SwitchItem
          label={getString('novelScreen.exportEpubModal.includeCustomJS')}
          description={getString('novelScreen.exportEpubModal.customJSWarning')}
          value={useCustomJS.value}
          onPress={useCustomJS.toggle}
          theme={theme}
        />
      </View>
      <List.InfoItem
        style={styles.infoItem}
        title={getString('novelScreen.exportEpubModal.downloadedChaptersOnly')}
        theme={theme}
      />
    </KeyboardAvoidingModal>
  );
};

export default ExportEpubModal;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 4,
  },
  infoItem: {
    paddingHorizontal: 0,
  },
  fileNameInput: {
    marginTop: 12,
  },
  settings: {
    marginTop: 12,
  },
  rangeInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rangeInput: {
    flex: 1,
  },
  warningContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 6,
  },
  warning: {
    fontSize: 12,
  },
  warningIcon: {
    marginStart: 4,
    marginEnd: 4,
  },
});
