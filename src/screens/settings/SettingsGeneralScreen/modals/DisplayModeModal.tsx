import { Modal } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useLibrarySettings } from '@hooks/persisted';
import {
  DisplayModes,
  displayModesList,
} from '@screens/library/constants/constants';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Portal } from 'react-native-paper';

interface DisplayModeModalProps {
  displayMode: DisplayModes;
  displayModalVisible: boolean;
  hideDisplayModal: () => void;
  theme: ThemeColors;
}

const DisplayModeModal: React.FC<DisplayModeModalProps> = ({
  theme,
  displayMode,
  hideDisplayModal,
  displayModalVisible,
}) => {
  const { setLibrarySettings } = useLibrarySettings();

  return (
    <Portal>
      <Modal visible={displayModalVisible} onDismiss={hideDisplayModal}>
        <Text style={[styles.modalHeader, { color: theme.onSurface }]}>
          {getString('generalSettingsScreen.displayMode')}
        </Text>
        {displayModesList.map(mode => (
          <RadioButton
            key={mode.value}
            status={displayMode === mode.value}
            onPress={() => setLibrarySettings({ displayMode: mode.value })}
            label={mode.label}
            theme={theme}
          />
        ))}
      </Modal>
    </Portal>
  );
};

export default DisplayModeModal;

const styles = StyleSheet.create({
  modalHeader: {
    fontSize: 24,
    marginBottom: 10,
  },
});
