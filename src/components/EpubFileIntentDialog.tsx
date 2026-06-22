import { Modal } from '@components';
import { useTheme } from '@hooks/persisted';
import { useEpubFileIntent } from '@hooks/persisted/useImport';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';

import Button from './Button/Button';

/**
 * Dialog shown when the user opens an EPUB file from an external app.
 * Mount once (in Main.tsx) so the intent listener is registered a single time.
 *
 * Uses the app's Modal/Button/theme primitives rather than raw paper Dialog
 * components, which would otherwise inherit paper's default (unthemed) MD3
 * colors since PaperProvider is not fed the app theme.
 */
const EpubFileIntentDialog = () => {
  const theme = useTheme();
  const { pendingFileImport, confirmFileImport, cancelFileImport } =
    useEpubFileIntent();

  return (
    <Portal>
      <Modal visible={!!pendingFileImport} onDismiss={cancelFileImport}>
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons
            name="book-plus"
            color={theme.primary}
            size={20}
          />
          <Text style={[styles.title, { color: theme.onSurface }]}>
            {getString('libraryScreen.extraMenu.importEpub')}
          </Text>
        </View>
        <Text
          style={[styles.filename, { color: theme.onSurfaceVariant }]}
          // numberOfLines={2}
          ellipsizeMode="middle"
        >
          {pendingFileImport?.filename}
        </Text>
        <View style={styles.buttonCtn}>
          <Button
            title={getString('common.cancel')}
            onPress={cancelFileImport}
          />
          <Button
            title={getString('libraryScreen.extraMenu.importEpub')}
            onPress={confirmFileImport}
          />
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  buttonCtn: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  filename: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
    fontStyle: 'italic',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default EpubFileIntentDialog;
