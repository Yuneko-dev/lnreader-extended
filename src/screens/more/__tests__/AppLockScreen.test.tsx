import Button from '@components/Button/Button';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppLockOverlay from '../AppLockScreen';

const mockTheme = {
  background: '#fff7ff',
  errorContainer: '#ffdad6',
  onBackground: '#201a1b',
  onErrorContainer: '#410002',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#21005d',
  onSurface: '#1d1b20',
  onSurfaceVariant: '#49454f',
  primary: '#6750a4',
  primaryContainer: '#eaddff',
  rippleColor: '#6750a41f',
};

jest.mock('@hooks/persisted', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

const renderOverlay = (
  props: Partial<React.ComponentProps<typeof AppLockOverlay>> = {},
) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 800, width: 400, x: 0, y: 0 },
        insets: { bottom: 0, left: 0, right: 0, top: 24 },
      }}
    >
      <AppLockOverlay
        isCredentialsRevoked={false}
        isLocked
        onAuthenticate={jest.fn()}
        onDismissRevoked={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );

const findIcon = (
  view: ReturnType<typeof render>,
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
) =>
  view
    .UNSAFE_getAllByType(MaterialCommunityIcons)
    .find(icon => icon.props.name === name);

describe('AppLockOverlay', () => {
  it('renders nothing when no lock state is active', () => {
    const view = renderOverlay({ isLocked: false });

    expect(view.UNSAFE_queryByType(Button)).toBeNull();
    expect(screen.queryByText('securitySettingsScreen.appLocked')).toBeNull();
  });

  it('presents an actionable Material lock state', () => {
    const onAuthenticate = jest.fn();
    const view = renderOverlay({ onAuthenticate });

    expect(findIcon(view, 'shield-lock-outline')?.props.color).toBe(
      mockTheme.onPrimaryContainer,
    );
    const heading = screen.getByRole('header', {
      name: 'securitySettingsScreen.appLocked',
    });
    expect(StyleSheet.flatten(heading.props.style)).toMatchObject({
      color: mockTheme.onBackground,
    });
    expect(screen.queryByText('\u{1F512}')).toBeNull();

    const button = view.UNSAFE_getByType(PaperButton);
    expect(button.props).toEqual(
      expect.objectContaining({
        icon: 'lock-open-variant-outline',
        mode: 'contained',
      }),
    );
    expect(button.props.contentStyle).toEqual(
      expect.objectContaining({ minHeight: 48 }),
    );

    fireEvent.press(screen.getByText('securitySettingsScreen.unlock'));
    expect(onAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('presents a dismissible Material revoked state', () => {
    const onDismissRevoked = jest.fn();
    const view = renderOverlay({
      isCredentialsRevoked: true,
      onDismissRevoked,
    });

    expect(findIcon(view, 'shield-alert-outline')?.props.color).toBe(
      mockTheme.onErrorContainer,
    );
    expect(
      screen.getByRole('header', {
        name: 'securitySettingsScreen.credentialsRevokedTitle',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('\u26A0\uFE0F')).toBeNull();

    fireEvent.press(screen.getByText('common.ok'));
    expect(onDismissRevoked).toHaveBeenCalledTimes(1);
  });
});
