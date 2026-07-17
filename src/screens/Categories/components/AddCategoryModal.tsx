import { KeyboardAvoidingModal } from '@components';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { TextInput } from 'react-native-paper';

import {
  createCategory,
  isCategoryNameDuplicate,
  updateCategory,
} from '../../../database/queries/CategoryQueries';
import { Category } from '../../../database/types';

interface AddCategoryModalProps {
  isEditMode?: boolean;
  category?: Category;
  visible: boolean;
  closeModal: () => void;
  onSuccess: () => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isEditMode,
  category,
  closeModal,
  visible,
  onSuccess,
}) => {
  const theme = useTheme();
  const [categoryName, setCategoryName] = useState(category?.name || '');

  function close() {
    setCategoryName('');
    closeModal();
  }
  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={getString(
        isEditMode ? 'categories.editCategories' : 'categories.addCategories',
      )}
      confirmLabel={getString(isEditMode ? 'common.ok' : 'common.add')}
      onDismiss={close}
      onConfirm={async () => {
        if (isCategoryNameDuplicate(categoryName)) {
          showToast(getString('categories.duplicateError'));
          return false;
        }

        if (isEditMode && category) {
          await updateCategory(category.id, categoryName);
        } else {
          await createCategory(categoryName);
        }
        onSuccess();
      }}
    >
      <TextInput
        autoFocus
        defaultValue={categoryName}
        placeholder={getString('common.name')}
        onChangeText={setCategoryName}
        mode="outlined"
        underlineColor={theme.outline}
        theme={{ colors: { ...theme } }}
      />
    </KeyboardAvoidingModal>
  );
};

export default AddCategoryModal;
