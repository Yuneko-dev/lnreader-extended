import {
  createCategory,
  isCategoryNameDuplicate,
  updateCategory,
} from '@database/queries/CategoryQueries';
import { Category } from '@database/types';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { showToast } from '@utils/showToast';
import React from 'react';
import { TextInputProps } from 'react-native';

import AddCategoryModal from '../AddCategoryModal';

let mockConfirmCategory: (() => Promise<void>) | undefined;

type MockKeyboardAvoidingModalProps = {
  children?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => boolean | void | Promise<boolean | void>;
  onDismiss: () => void;
  title: React.ReactNode;
};

type MockTextInputProps = Pick<
  TextInputProps,
  'onChangeText' | 'placeholder' | 'value'
>;

jest.mock('@components', () => {
  const ReactModule = jest.requireActual('react');
  const { Text, TextInput, View } = jest.requireActual('react-native');

  return {
    KeyboardAvoidingModal: ({
      children,
      confirmLabel,
      onConfirm,
      onDismiss,
      title,
    }: MockKeyboardAvoidingModalProps) => {
      mockConfirmCategory = async () => {
        const result = await onConfirm();
        if (result !== false) onDismiss();
      };
      return ReactModule.createElement(
        View,
        null,
        ReactModule.createElement(Text, null, title),
        children,
        ReactModule.createElement(
          View,
          { testID: 'confirm-category' },
          ReactModule.createElement(Text, null, confirmLabel),
        ),
      );
    },
    StableTextInput: (props: MockTextInputProps) =>
      ReactModule.createElement(TextInput, {
        ...props,
        testID: 'category-name-input',
      }),
  };
});

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({ outline: '#777777' }),
}));

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@utils/showToast', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../../../database/queries/CategoryQueries', () => ({
  createCategory: jest.fn(),
  isCategoryNameDuplicate: jest.fn(),
  updateCategory: jest.fn(),
}));

const mockCreateCategory = createCategory as jest.MockedFunction<
  typeof createCategory
>;
const mockIsCategoryNameDuplicate =
  isCategoryNameDuplicate as jest.MockedFunction<
    typeof isCategoryNameDuplicate
  >;
const mockUpdateCategory = updateCategory as jest.MockedFunction<
  typeof updateCategory
>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

const submit = async () => {
  await act(async () => {
    await mockConfirmCategory?.();
  });
};

describe('AddCategoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmCategory = undefined;
    mockIsCategoryNameDuplicate.mockReturnValue(false);
    mockCreateCategory.mockResolvedValue({ id: 1, name: 'New', sort: 1 });
    mockUpdateCategory.mockResolvedValue(undefined);
  });

  it('keeps the modal open and skips writes for duplicate names', async () => {
    mockIsCategoryNameDuplicate.mockReturnValue(true);
    const closeModal = jest.fn();
    const onSuccess = jest.fn();

    render(
      <AddCategoryModal
        visible
        closeModal={closeModal}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.changeText(
      screen.getByTestId('category-name-input'),
      'Duplicate',
    );
    await submit();

    expect(mockIsCategoryNameDuplicate).toHaveBeenCalledWith('Duplicate');
    expect(mockShowToast).toHaveBeenCalledWith('categories.duplicateError');
    expect(mockCreateCategory).not.toHaveBeenCalled();
    expect(mockUpdateCategory).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('creates a category before notifying and dismissing', async () => {
    const closeModal = jest.fn();
    const onSuccess = jest.fn();

    render(
      <AddCategoryModal
        visible
        closeModal={closeModal}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.changeText(screen.getByTestId('category-name-input'), 'New');
    await submit();

    expect(mockCreateCategory).toHaveBeenCalledWith('New');
    expect(mockUpdateCategory).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('updates the selected category before notifying and dismissing', async () => {
    const closeModal = jest.fn();
    const onSuccess = jest.fn();
    const category = { id: 7, name: 'Old' } as Category;

    render(
      <AddCategoryModal
        visible
        isEditMode
        category={category}
        closeModal={closeModal}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.changeText(screen.getByTestId('category-name-input'), 'Updated');
    await submit();

    expect(mockUpdateCategory).toHaveBeenCalledWith(7, 'Updated');
    expect(mockCreateCategory).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
