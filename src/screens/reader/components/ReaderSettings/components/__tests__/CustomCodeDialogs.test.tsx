import { render, screen } from '@testing-library/react-native';
import React from 'react';

import RegexDialog from '../RegexDialog';
import SnippetDialog from '../SnippetDialog';

const theme = {
  primary: '#d0bcff',
  surface: '#1c1b1f',
  surfaceVariant: '#49454f',
  onSurface: '#e6e1e5',
  onSurfaceVariant: '#cac4d0',
  outline: '#938f99',
  error: '#f2b8b5',
  rippleColor: '#33ffffff',
};

type InputProps = {
  label: string;
  theme?: unknown;
  textColor?: string;
};

jest.mock('@hooks', () => ({
  useBoolean: () => ({
    value: false,
    setTrue: jest.fn(),
    setFalse: jest.fn(),
  }),
}));

jest.mock('@hooks/persisted', () => ({
  useTheme: () => theme,
}));

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@specs/NativeFile', () => ({
  getConstants: () => ({ ExternalCachesDirectoryPath: '/cache' }),
}));

jest.mock('@components', () => ({
  Button: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{title}</Text>;
  },
  Checkbox: ({ label }: { label: string }) => {
    const { Text } = require('react-native');
    return <Text>{label}</Text>;
  },
  KeyboardAvoidingModal: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    );
  },
  Menu: ({
    anchor,
    children,
  }: {
    anchor: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const { View } = require('react-native');
    return (
      <View>
        {anchor}
        {children}
      </View>
    );
  },
  StableTextInput: ({ label, theme: inputTheme, textColor }: InputProps) => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return ReactModule.createElement(View, {
      inputTheme,
      testID: `input-${label}`,
      textColor,
    });
  },
}));

jest.mock('react-native-paper', () => ({
  HelperText: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
  Icon: () => null,
  Text: ({ children, ...props }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

describe('custom code dialogs', () => {
  it('uses Material 3 fields and a separated Regex test section', () => {
    render(<RegexDialog visible onDismiss={jest.fn()} onSave={jest.fn()} />);

    const inputs = [
      'customCodeSettings.ruleTitle',
      'customCodeSettings.regexPattern',
      'customCodeSettings.replaceWith',
      'customCodeSettings.sampleInput',
    ];
    inputs.forEach(label => {
      expect(screen.getByTestId(`input-${label}`).props).toMatchObject({
        inputTheme: {
          colors: expect.objectContaining({
            background: theme.surface,
            primary: theme.primary,
          }),
        },
        textColor: theme.onSurface,
      });
    });

    expect(screen.queryByText('customCodeSettings.titleRequired')).toBeNull();
    expect(screen.queryByText('customCodeSettings.patternRequired')).toBeNull();
    expect(screen.getByTestId('regex-test-section')).toBeTruthy();
  });

  it('uses Material 3 fields without reserving hidden error rows in snippets', () => {
    render(
      <SnippetDialog
        language="css"
        visible
        onDismiss={jest.fn()}
        onSave={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('input-customCodeSettings.snippetName').props,
    ).toMatchObject({
      inputTheme: {
        colors: expect.objectContaining({ background: theme.surface }),
      },
      textColor: theme.onSurface,
    });
    expect(
      screen.getByTestId('input-customCodeSettings.snippetCode').props,
    ).toMatchObject({
      inputTheme: {
        colors: expect.objectContaining({ background: theme.surface }),
      },
      textColor: theme.onSurface,
    });
    expect(screen.queryByText('customCodeSettings.nameRequired')).toBeNull();
    expect(screen.queryByText('customCodeSettings.codeRequired')).toBeNull();
  });
});
