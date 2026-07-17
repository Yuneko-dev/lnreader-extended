import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import StableTextInput from '../index';

const mockFocus = jest.fn();
const mockIsFocused = jest.fn(() => false);
const mockSetSelection = jest.fn();
let mockLatestProps: Record<string, unknown> = {};
let mockMountCount = 0;

jest.mock('react-native-paper', () => {
  const ReactModule = jest.requireActual('react');
  const { TextInput: NativeTextInput } = jest.requireActual('react-native');

  const TextInput = ReactModule.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      mockLatestProps = props;

      ReactModule.useEffect(() => {
        mockMountCount += 1;
      }, []);

      ReactModule.useImperativeHandle(ref, () => ({
        focus: mockFocus,
        isFocused: mockIsFocused,
        setSelection: mockSetSelection,
      }));

      return ReactModule.createElement(NativeTextInput, {
        ...props,
        testID: 'stable-input',
      });
    },
  );

  return { TextInput };
});

describe('StableTextInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(false);
    mockLatestProps = {};
    mockMountCount = 0;
  });

  it('leaves text and selection under native control', () => {
    render(<StableTextInput value="initial" onChangeText={jest.fn()} />);

    expect(mockLatestProps.defaultValue).toBe('initial');
    expect(mockLatestProps).not.toHaveProperty('value');
    expect(mockLatestProps).not.toHaveProperty('selection');
  });

  it('does not remount when value only echoes native input', () => {
    const onChangeText = jest.fn();
    const view = render(
      <StableTextInput value="initial" onChangeText={onChangeText} />,
    );

    fireEvent.changeText(screen.getByTestId('stable-input'), 'prediction');
    view.rerender(
      <StableTextInput value="prediction" onChangeText={onChangeText} />,
    );

    expect(onChangeText).toHaveBeenCalledWith('prediction');
    expect(mockMountCount).toBe(1);
  });

  it('remounts for an external value and restores focused input', () => {
    mockIsFocused.mockReturnValue(true);
    const view = render(
      <StableTextInput value="initial" onChangeText={jest.fn()} />,
    );

    view.rerender(<StableTextInput value="reset" onChangeText={jest.fn()} />);

    expect(mockMountCount).toBe(2);
    expect(mockLatestProps.defaultValue).toBe('reset');
    expect(mockFocus).toHaveBeenCalledTimes(1);
    expect(mockSetSelection).toHaveBeenCalledWith(5, 5);
  });
});
