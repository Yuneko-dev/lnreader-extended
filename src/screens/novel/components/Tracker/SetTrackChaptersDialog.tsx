import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { useTheme } from '@hooks/persisted';
import React, { useEffect, useState } from 'react';

import { TrackChaptersDialogProps } from './types';

const SetTrackChaptersDialog: React.FC<TrackChaptersDialogProps> = ({
  trackItem,
  visible,
  onDismiss,
  onUpdateChapters,
}) => {
  const theme = useTheme();
  const [chapters, setChapters] = useState(String(trackItem.progress ?? 0));

  useEffect(() => {
    if (visible) {
      setChapters(String(trackItem.progress ?? 0));
    }
  }, [visible, trackItem.progress]);

  const handleSave = () => {
    onUpdateChapters(chapters);
  };

  const handleChangeText = (text: string) => {
    setChapters(text || '');
  };

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title="Chapters"
      onDismiss={onDismiss}
      onConfirm={handleSave}
    >
      <StableTextInput
        value={chapters}
        onChangeText={handleChangeText}
        mode="outlined"
        keyboardType="numeric"
        theme={{
          colors: {
            primary: theme.primary,
            placeholder: theme.outline,
            text: theme.onSurface,
            background: 'transparent',
          },
        }}
        underlineColor={theme.outline}
      />
    </KeyboardAvoidingModal>
  );
};

export default SetTrackChaptersDialog;
