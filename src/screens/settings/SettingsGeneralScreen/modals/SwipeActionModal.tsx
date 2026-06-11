import { Modal } from '@components';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { useAppSettings } from '@hooks/persisted';
import { SwipeAction } from '@hooks/persisted/useSettings';
import { getString } from '@strings/translations';
import { StringMap } from '@strings/types';
import { ThemeColors } from '@theme/types';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Portal } from 'react-native-paper';

interface SwipeActionModalProps {
  actionType: 'left' | 'right';
  currentAction: SwipeAction;
  modalVisible: boolean;
  hideModal: () => void;
  theme: ThemeColors;
}

const swipeActionList: { value: SwipeAction; label: string }[] = [
  { value: 'disabled', label: 'swipeActionDisabled' },
  { value: 'bookmark', label: 'swipeActionBookmark' },
  { value: 'markAsRead', label: 'swipeActionMarkAsRead' },
  { value: 'download', label: 'swipeActionDownload' },
];

const SwipeActionModal: React.FC<SwipeActionModalProps> = ({
  theme,
  actionType,
  currentAction,
  hideModal,
  modalVisible,
}) => {
  const { setAppSettings } = useAppSettings();

  return (
    <Portal>
      <Modal visible={modalVisible} onDismiss={hideModal}>
        <Text style={[styles.modalHeader, { color: theme.onSurface }]}>
          {getString(
            actionType === 'left' ? 'swipeActionLeft' : 'swipeActionRight',
          )}
        </Text>
        {swipeActionList.map(action => (
          <RadioButton
            key={action.value}
            status={currentAction === action.value}
            onPress={() => {
              if (actionType === 'left') {
                setAppSettings({ swipeActionLeft: action.value });
              } else {
                setAppSettings({ swipeActionRight: action.value });
              }
              hideModal();
            }}
            label={getString(action.label as keyof StringMap)}
            theme={theme}
          />
        ))}
      </Modal>
    </Portal>
  );
};

export default SwipeActionModal;

const styles = StyleSheet.create({
  modalHeader: {
    fontSize: 24,
    marginBottom: 10,
  },
});
