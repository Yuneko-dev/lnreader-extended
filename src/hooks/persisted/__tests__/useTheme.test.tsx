import type {
  DynamicColorPalette,
  MaterialYouConstants,
} from '@specs/NativeMaterialYou';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Appearance, Text } from 'react-native';

import { ThemeProvider, useAvailableThemes, useTheme } from '../useTheme';

const mockGetConstants = jest.fn<MaterialYouConstants, []>();
const mockValues: Record<string, string | number | boolean | undefined> = {};

jest.mock('@specs/NativeMaterialYou', () => ({
  __esModule: true,
  default: { getConstants: () => mockGetConstants() },
}));

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('react-native-mmkv', () => ({
  useMMKVBoolean: (key: string) => [mockValues[key], jest.fn()],
  useMMKVNumber: (key: string) => [mockValues[key], jest.fn()],
  useMMKVString: (key: string) => [mockValues[key], jest.fn()],
}));

const palette = (primary: string): DynamicColorPalette => ({
  primary,
  onPrimary: '#FFFFFF',
  primaryContainer: '#CCDDEE',
  onPrimaryContainer: '#112233',
  secondary: '#445566',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DDEEFF',
  onSecondaryContainer: '#223344',
  tertiary: '#665544',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFEEDD',
  onTertiaryContainer: '#332211',
  background: '#FAF8FC',
  onBackground: '#202124',
  surface: '#FAF8FC',
  onSurface: '#202124',
  surfaceVariant: '#E2E2EC',
  onSurfaceVariant: '#45464F',
  outline: '#767680',
  outlineVariant: '#C6C6D0',
  inverseSurface: '#303034',
  inverseOnSurface: '#F2F0F4',
  inversePrimary: '#B1C5FF',
});

const nativeConstants = (isAvailable: boolean): MaterialYouConstants => ({
  isAvailable,
  light: palette('#123456'),
  dark: palette('#ABCDEF'),
});

const Consumer = () => {
  const theme = useTheme();
  const availableThemes = useAvailableThemes();

  return (
    <>
      <Text testID="theme">{`${theme.id}:${theme.primary}`}</Text>
      <Text testID="themes">
        {availableThemes.light.map(item => item.id).join(',')}
      </Text>
    </>
  );
};

describe('ThemeProvider Material You behavior', () => {
  beforeEach(() => {
    mockValues.APP_THEME_ID = 10000;
    mockValues.THEME_MODE = 'light';
    mockValues.CUSTOM_ACCENT_COLOR = '#FF00FF';
    mockValues.AMOLED_BLACK = false;
    mockGetConstants.mockReturnValue(nativeConstants(true));
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
  });

  it('uses Material You and ignores a stored custom accent', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').props.children).toBe('10000:#123456');
    expect(screen.getByTestId('themes').props.children).toContain('100,10000');
  });

  it('falls back to Default without overwriting the restored theme ID', () => {
    mockGetConstants.mockReturnValue(nativeConstants(false));

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').props.children).toBe('100:#FF00FF');
    expect(mockValues.APP_THEME_ID).toBe(10000);
    expect(screen.getByTestId('themes').props.children).not.toContain('10000');
  });

  it('removes the Appearance listener on unmount', () => {
    const remove = jest.fn();
    jest
      .spyOn(Appearance, 'addChangeListener')
      .mockReturnValue({ remove } as never);

    const view = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    view.unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
