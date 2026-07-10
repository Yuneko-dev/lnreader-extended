import { Modal, RadioButton } from '@components';
import { useTheme } from '@hooks/persisted';
import { DOH_PROVIDERS, type DohProviderId } from '@services/network/doh';
import { getString } from '@strings/translations';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Dialog } from 'react-native-paper';

interface DohProviderModalProps {
  currentProvider: DohProviderId;
  visible: boolean;
  onDismiss: () => void;
  onSelect: (providerId: DohProviderId) => void;
}

const DohProviderModal = ({
  currentProvider,
  visible,
  onDismiss,
  onSelect,
}: DohProviderModalProps) => {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.container}
    >
      <Dialog.Title theme={{ colors: theme }} style={styles.title}>
        {getString('advancedSettingsScreen.dnsOverHttps')}
      </Dialog.Title>
      <FlatList
        data={DOH_PROVIDERS}
        keyExtractor={provider => provider.id}
        renderItem={({ item }) => (
          <RadioButton
            label={
              item.id === 'disabled'
                ? getString('advancedSettingsScreen.disabled')
                : item.name
            }
            status={currentProvider === item.id}
            onPress={() => onSelect(item.id)}
            theme={theme}
            style={styles.option}
          />
        )}
      />
    </Modal>
  );
};

export default DohProviderModal;

const styles = StyleSheet.create({
  container: { maxHeight: '70%' },
  option: { paddingHorizontal: 0 },
  title: { marginHorizontal: 0, marginTop: 0, paddingHorizontal: 0 },
});
