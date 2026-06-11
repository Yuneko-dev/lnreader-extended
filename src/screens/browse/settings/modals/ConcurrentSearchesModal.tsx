import { Modal } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useBrowseSettings } from '@hooks/persisted/index';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Portal } from 'react-native-paper';

interface DisplayModeModalProps {
  globalSearchConcurrency: number;
  modalVisible: boolean;
  hideModal: () => void;
  theme: ThemeColors;
}

const ConcurrentSearchesModal: React.FC<DisplayModeModalProps> = ({
  theme,
  globalSearchConcurrency,
  hideModal,
  modalVisible,
}) => {
  const { setBrowseSettings } = useBrowseSettings();

  return (
    <Portal>
      <Modal visible={modalVisible} onDismiss={hideModal}>
        <Text style={[styles.modalHeader, { color: theme.onSurface }]}>
          {getString('browseSettingsScreen.concurrentSearches')}
        </Text>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(concurrency => (
          <RadioButton
            key={concurrency}
            status={globalSearchConcurrency === concurrency}
            onPress={() =>
              setBrowseSettings({ globalSearchConcurrency: concurrency })
            }
            label={concurrency.toString()}
            theme={theme}
          />
        ))}
      </Modal>
    </Portal>
  );
};

export default ConcurrentSearchesModal;

const styles = StyleSheet.create({
  modalHeader: {
    fontSize: 24,
    marginBottom: 10,
    paddingHorizontal: 24,
  },
});
