import { MarkdownText, Modal } from '@components';
import { GithubUpdateRelease } from '@hooks/common/useGithubUpdateChecker';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Portal } from 'react-native-paper';

import Button from './Button/Button';

interface NewUpdateDialogProps {
  newVersion: GithubUpdateRelease;
  onDismiss?: () => void;
}

const NewUpdateDialog: React.FC<NewUpdateDialogProps> = ({
  newVersion,
  onDismiss,
}) => {
  const [newUpdateDialog, showNewUpdateDialog] = useState(true);

  const theme = useTheme();

  const modalHeight = Dimensions.get('window').height / 2;
  const dismiss = () => {
    showNewUpdateDialog(false);
    onDismiss?.();
  };

  return (
    <Portal>
      <Modal visible={newUpdateDialog} onDismiss={dismiss}>
        <Text style={[styles.modalHeader, { color: theme.onSurface }]}>
          {`${getString('common.newUpdateAvailable')} ${newVersion.tag_name}`}
        </Text>
        <ScrollView style={{ height: modalHeight }}>
          <MarkdownText markdown={newVersion.body} theme={theme} />
        </ScrollView>
        <View style={styles.buttonCtn}>
          <Button title={getString('common.cancel')} onPress={dismiss} />
          <Button
            title={getString('common.install')}
            onPress={() =>
              Linking.openURL(
                'https://github.com/Yuneko-dev/lnreader-extended/releases',
              )
            }
          />
        </View>
      </Modal>
    </Portal>
  );
};

export default NewUpdateDialog;

const styles = StyleSheet.create({
  buttonCtn: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
