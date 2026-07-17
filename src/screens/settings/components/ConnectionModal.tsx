import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React from 'react';

interface ConnectionModalProps {
  title: string;
  ipv4: string;
  port: string;
  visible: boolean;
  theme: ThemeColors;
  closeModal: () => void;
  handle: (ipv4: string, port: string) => Promise<void>;
  setIpv4: React.Dispatch<React.SetStateAction<string>>;
  setPort: React.Dispatch<React.SetStateAction<string>>;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  title,
  ipv4,
  port,
  visible,
  theme,
  closeModal,
  handle,
  setIpv4,
  setPort,
}) => {
  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={title}
      confirmLabel={getString('common.ok')}
      onDismiss={closeModal}
      onConfirm={() => handle(ipv4, port)}
    >
      <StableTextInput
        value={ipv4}
        placeholder="xxx.xxx.xxx.xxx"
        onChangeText={setIpv4}
        mode="outlined"
        underlineColor={theme.outline}
        theme={{ colors: { ...theme } }}
        placeholderTextColor={theme.onSurfaceDisabled}
      />
      <StableTextInput
        value={port}
        onChangeText={setPort}
        mode="outlined"
        underlineColor={theme.outline}
        theme={{ colors: { ...theme } }}
        placeholderTextColor={theme.onSurfaceDisabled}
      />
    </KeyboardAvoidingModal>
  );
};

export default ConnectionModal;
