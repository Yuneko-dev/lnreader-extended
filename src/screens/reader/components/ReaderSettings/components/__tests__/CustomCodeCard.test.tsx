import { fireEvent, render, screen } from '@testing-library/react-native';
import { defaultTheme } from '@theme/md3/defaultTheme';
import type { ThemeColors } from '@theme/types';
import React from 'react';

import CustomCodeCard from '../CustomCodeCard';

const theme = { ...defaultTheme.dark, id: 1 } as ThemeColors;

describe('CustomCodeCard', () => {
  it('toggles only when the card body is pressed', () => {
    const onToggle = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <CustomCodeCard
        active
        deleteLabel="Delete snippet"
        description="Enabled"
        detail="body { color: red; }"
        editLabel="Edit snippet"
        onDelete={onDelete}
        onEdit={onEdit}
        onToggle={onToggle}
        theme={theme}
        title="Reader colors"
      />,
    );

    fireEvent.press(screen.getByText('Reader colors'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Edit snippet'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Delete snippet'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('visually exposes the disabled state', () => {
    render(
      <CustomCodeCard
        active={false}
        deleteLabel="Delete rule"
        description="Disabled"
        editLabel="Edit rule"
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onToggle={jest.fn()}
        theme={theme}
        title="Remove ads"
      />,
    );

    expect(screen.getByText('Disabled')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove ads' }).props).toEqual(
      expect.objectContaining({ accessibilityState: { checked: false } }),
    );
  });
});
