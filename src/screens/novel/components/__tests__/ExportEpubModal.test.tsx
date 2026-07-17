import { fireEvent, render, screen } from '@testing-library/react-native';
import { showToast } from '@utils/showToast';
import React from 'react';

import ExportEpubModal from '../ExportEpubModal';

const mockSetChapterReaderSettings = jest.fn();

jest.mock('@components', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    KeyboardAvoidingModal: ({
      children,
      confirmLabel,
      onConfirm,
      onDismiss,
      title,
      visible,
    }: {
      children: React.ReactNode;
      confirmLabel: string;
      onConfirm: () => boolean | void;
      onDismiss: () => void;
      title: React.ReactNode;
      visible: boolean;
    }) =>
      visible
        ? ReactModule.createElement(
            View,
            null,
            ReactModule.createElement(Text, null, title),
            children,
            ReactModule.createElement(
              Pressable,
              {
                onPress: () => {
                  if (onConfirm() !== false) onDismiss();
                },
              },
              ReactModule.createElement(Text, null, confirmLabel),
            ),
          )
        : null,
    List: {
      InfoItem: ({ title }: { title: string }) =>
        ReactModule.createElement(Text, null, title),
    },
    SwitchItem: ({
      label,
      onPress,
      value,
    }: {
      label: string;
      onPress: () => void;
      value: boolean;
    }) =>
      ReactModule.createElement(
        Pressable,
        { onPress },
        ReactModule.createElement(Text, null, `${label}:${value}`),
      ),
  };
});

jest.mock('@hooks/persisted', () => ({
  useChapterReaderSettings: () => ({
    epubLocation: 'content://exports',
    epubUseAppTheme: false,
    epubUseCustomCSS: false,
    epubUseCustomJS: false,
    setChapterReaderSettings: mockSetChapterReaderSettings,
  }),
  useTheme: () => ({
    onSurface: '#000000',
    onSurfaceVariant: '#666666',
    outline: '#cccccc',
  }),
}));

jest.mock('@react-native-vector-icons/material-design-icons', () => {
  const ReactModule = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return ({ name }: { name: string }) =>
    ReactModule.createElement(Text, null, name);
});

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@utils/showToast', () => ({
  showToast: jest.fn(),
}));

jest.mock('react-native-paper', () => {
  const ReactModule = jest.requireActual('react');
  const {
    Pressable,
    Text,
    TextInput: RNTextInput,
  } = jest.requireActual('react-native');

  const TextInput = ({
    label,
    placeholder,
    ...props
  }: {
    label?: string;
    placeholder?: string;
  }) =>
    ReactModule.createElement(RNTextInput, {
      accessibilityLabel: label || placeholder,
      placeholder: placeholder || label,
      ...props,
    });

  TextInput.Icon = ({ icon, onPress }: { icon: string; onPress: () => void }) =>
    ReactModule.createElement(
      Pressable,
      { accessibilityLabel: icon, onPress },
      ReactModule.createElement(Text, null, icon),
    );

  return {
    Text,
    TextInput,
  };
});

jest.mock('react-native-saf-x', () => ({
  openDocumentTree: jest.fn(),
}));

const renderModal = (
  props?: Partial<React.ComponentProps<typeof ExportEpubModal>>,
) => {
  const onSubmit = jest.fn();
  const hideModal = jest.fn();
  const view = render(
    <ExportEpubModal
      isVisible
      hideModal={hideModal}
      novelName="Test Novel"
      onSubmit={onSubmit}
      {...props}
    />,
  );

  return { ...view, hideModal, onSubmit };
};

const submitFileName = (fileName: string) => {
  const view = renderModal();

  fireEvent.changeText(
    screen.getByLabelText('novelScreen.exportEpubModal.fileName (.epub)'),
    fileName,
  );
  fireEvent.press(screen.getByText('common.submit'));

  return view;
};

describe('ExportEpubModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits a valid custom file name', () => {
    const view = submitFileName('My Export');

    expect(view.onSubmit).toHaveBeenCalledWith(
      'content://exports',
      'My Export',
      undefined,
      undefined,
    );
    expect(view.hideModal).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('strips a trailing epub extension before submit', () => {
    const view = submitFileName('My Export.epub');

    expect(view.onSubmit).toHaveBeenCalledWith(
      'content://exports',
      'My Export',
      undefined,
      undefined,
    );
  });

  it('trims the file name before submit', () => {
    const view = submitFileName('  My Export  ');

    expect(view.onSubmit).toHaveBeenCalledWith(
      'content://exports',
      'My Export',
      undefined,
      undefined,
    );
  });

  it.each(['', '   ', '.epub', 'bad/name', 'bad:name'])(
    'rejects invalid file name %p',
    fileName => {
      const view = submitFileName(fileName);

      expect(showToast).toHaveBeenCalledWith(
        'novelScreen.exportEpubModal.invalidFileName',
      );
      expect(view.onSubmit).not.toHaveBeenCalled();
      expect(view.hideModal).not.toHaveBeenCalled();
    },
  );
});
