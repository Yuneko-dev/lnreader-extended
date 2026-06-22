import { useEpubFileIntent } from '@hooks/persisted/useImport';
import { getString } from '@strings/translations';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

/**
 * Dialog shown when the user opens an EPUB file from an external app.
 * Mount once (in Main.tsx) so the intent listener is registered a single time.
 */
const EpubFileIntentDialog = () => {
  const { pendingFileImport, confirmFileImport, cancelFileImport } =
    useEpubFileIntent();

  return (
    <Portal>
      <Dialog visible={!!pendingFileImport} onDismiss={cancelFileImport}>
        <Dialog.Icon icon="book-plus" />
        <Dialog.Title style={styles.textCenter}>
          {getString('libraryScreen.extraMenu.importEpub')}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.textCenter}>
            {pendingFileImport?.filename}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={cancelFileImport}>
            {getString('common.cancel')}
          </Button>
          <Button onPress={confirmFileImport}>
            {getString('libraryScreen.extraMenu.importEpub')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  textCenter: {
    textAlign: 'center',
  },
});

export default EpubFileIntentDialog;
