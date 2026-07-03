import { fireEvent, render, screen } from '@testing-library/react-native';
import { defaultTheme } from '@theme/md3/defaultTheme';
import { ThemeColors } from '@theme/types';
import React from 'react';

import { ThemePicker } from '../ThemePicker';

describe('ThemePicker accessibility', () => {
  it('exposes a radio label and selected state', () => {
    const onPress = jest.fn();
    const theme = {
      ...defaultTheme.light,
      id: 100,
      name: 'Material You',
    } as ThemeColors;
    render(
      <ThemePicker theme={theme} currentTheme={theme} onPress={onPress} />,
    );

    const picker = screen.getByRole('radio', { name: 'Material You' });
    expect(picker.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(picker);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
