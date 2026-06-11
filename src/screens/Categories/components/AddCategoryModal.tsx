import { Button, Modal } from '@components/index';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Portal, TextInput } from 'react-native-paper';

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
  function finalize() {
    onSuccess();
    close();
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={close}>
        <KeyboardAwareScrollView>
          <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
            {getString(
              isEditMode
                ? 'categories.editCategories'
                : 'categories.addCategories',
            )}
          </Text>
          <TextInput
            autoFocus
            defaultValue={categoryName}
            placeholder={getString('common.name')}
            onChangeText={setCategoryName}
            mode="outlined"
            underlineColor={theme.outline}
            theme={{ colors: { ...theme } }}
          />
          <View style={styles.btnContainer}>
            <Button
              title={getString(isEditMode ? 'common.ok' : 'common.add')}
              onPress={async () => {
                if (isCategoryNameDuplicate(categoryName)) {
                  showToast(getString('categories.duplicateError'));
                } else {
                  if (isEditMode && category) {
                    await updateCategory(category?.id, categoryName);
                  } else {
                    await createCategory(categoryName);
                  }
                  finalize();
                }
              }}
            />
            <Button title={getString('common.cancel')} onPress={close} />
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
};

export default AddCategoryModal;

const styles = StyleSheet.create({
  btnContainer: {
    flexDirection: 'row-reverse',
    marginTop: 24,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
});
