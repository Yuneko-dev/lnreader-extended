import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { Repository } from '@database/types';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React, { useState } from 'react';

interface AddRepositoryModalProps {
  repository?: Repository;
  visible: boolean;
  closeModal: () => void;
  upsertRepository: (repositoryUrl: string, repository?: Repository) => void;
}

const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  repository,
  closeModal,
  visible,
  upsertRepository,
}) => {
  const theme = useTheme();
  const [repositoryUrl, setRepositoryUrl] = useState(repository?.url || '');

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={repository ? 'Edit repository' : 'Add repository'}
      confirmLabel={getString(repository ? 'common.ok' : 'common.add')}
      onDismiss={closeModal}
      onConfirm={() => upsertRepository(repositoryUrl, repository)}
    >
      <StableTextInput
        autoFocus
        value={repositoryUrl}
        placeholder="Repo URL"
        onChangeText={setRepositoryUrl}
        mode="outlined"
        underlineColor={theme.outline}
        theme={{ colors: { ...theme } }}
      />
    </KeyboardAvoidingModal>
  );
};

export default AddRepositoryModal;
