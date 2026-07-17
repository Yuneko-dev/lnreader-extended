import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import MarkdownText from '../MarkdownText';

jest.mock('react-native-enriched-markdown', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');

  return {
    EnrichedMarkdownText: ({
      onLinkPress,
    }: {
      onLinkPress: (event: { url: string }) => void;
    }) =>
      ReactModule.createElement(Pressable, {
        testID: 'markdown-link',
        onPress: () => onLinkPress({ url: 'https://example.com/novel' }),
      }),
  };
});

jest.mock('@components/ConfirmationDialog/ConfirmationDialog', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return ({
    message,
    onDismiss,
    onSubmit,
    title,
    visible,
  }: {
    message: string;
    onDismiss: () => void;
    onSubmit: () => void;
    title: string;
    visible: boolean;
  }) =>
    visible
      ? ReactModule.createElement(
          View,
          { testID: 'external-link-dialog' },
          ReactModule.createElement(Text, null, title),
          ReactModule.createElement(Text, null, message),
          ReactModule.createElement(Pressable, {
            testID: 'confirm-external-link',
            onPress: () => {
              onSubmit();
              onDismiss();
            },
          }),
          ReactModule.createElement(Pressable, {
            testID: 'cancel-external-link',
            onPress: onDismiss,
          }),
        )
      : null;
});

jest.mock('@strings/translations', () => ({
  getString: (key: string, options?: { url?: string }) =>
    options?.url ? `${key}: ${options.url}` : key,
}));

const theme = {
  background: '#ffffff',
  onSurface: '#111111',
  onSurfaceVariant: '#444444',
  outlineVariant: '#cccccc',
  primary: '#0066cc',
  surface: '#ffffff',
  surfaceVariant: '#eeeeee',
} as never;

describe('MarkdownText links', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  it('shows the reusable confirmation and cancels without opening the URL', () => {
    render(
      <MarkdownText
        markdown="[Novel](https://example.com/novel)"
        theme={theme}
      />,
    );

    fireEvent.press(screen.getByTestId('markdown-link'));

    expect(screen.getByTestId('external-link-dialog')).toBeTruthy();
    expect(screen.getByText('externalLinkDialog.title')).toBeTruthy();
    expect(
      screen.getByText('externalLinkDialog.message: https://example.com/novel'),
    ).toBeTruthy();
    expect(Linking.openURL).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('cancel-external-link'));

    expect(screen.queryByTestId('external-link-dialog')).toBeNull();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens the pending URL only after confirmation', () => {
    render(
      <MarkdownText
        markdown="[Novel](https://example.com/novel)"
        theme={theme}
      />,
    );

    fireEvent.press(screen.getByTestId('markdown-link'));
    expect(Linking.openURL).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('confirm-external-link'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/novel');
    expect(screen.queryByTestId('external-link-dialog')).toBeNull();
  });
});
