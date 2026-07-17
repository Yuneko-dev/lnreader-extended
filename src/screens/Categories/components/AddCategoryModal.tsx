import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';

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
  const defaultCategoryName = isEditMode && category ? category.name : '';
  const [categoryName, setCategoryName] = useState(defaultCategoryName);

  function close() {
    // Reset the category name to the default value when closing the modal
    setCategoryName(defaultCategoryName);
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
        if (!categoryName.trim()) {
          showToast(getString('categories.emptyError'));
          return false;
        }
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
      <StableTextInput
        autoFocus
        value={categoryName}
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
