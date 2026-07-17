import { KeyboardAvoidingModal } from '@components';
import { RadioButton, RadioButtonGroup } from '@components/RadioButton';
import { useTheme } from '@hooks/persisted';
import { UserListStatus } from '@services/Trackers';
import React, { useEffect, useState } from 'react';

import { STATUS_LABELS } from './constants';
import { TrackStatusDialogProps } from './types';

const SetTrackStatusDialog: React.FC<TrackStatusDialogProps> = ({
  trackItem,
  visible,
  onDismiss,
  onUpdateStatus,
}) => {
  const theme = useTheme();
  const [selectedStatus, setSelectedStatus] = useState(trackItem.status);

  useEffect(() => {
    if (visible) {
      setSelectedStatus(trackItem.status);
    }
  }, [visible, trackItem.status]);

  const handleSave = () => {
    onUpdateStatus(selectedStatus);
  };

  const handleValueChange = (value: string) => {
    setSelectedStatus(value as UserListStatus);
  };

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title="Status"
      onDismiss={onDismiss}
      onConfirm={handleSave}
    >
      <RadioButtonGroup
        onValueChange={handleValueChange}
        value={selectedStatus}
      >
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <RadioButton key={key} value={key} label={label} theme={theme} />
        ))}
      </RadioButtonGroup>
    </KeyboardAvoidingModal>
  );
};

export default SetTrackStatusDialog;
