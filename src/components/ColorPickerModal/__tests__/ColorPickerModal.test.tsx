import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import ColorPickerModal from '../ColorPickerModal';

type ColorResult = {
  hex: string;
};

type ColorPickerProps = {
  children?: React.ReactNode;
  onCompleteJS?: (color: ColorResult) => void;
  value: string;
};

type InputWidgetProps = {
  disableAlphaChannel?: boolean;
  formats?: readonly string[];
};

type HueCircularProps = {
  children?: React.ReactNode;
  containerStyle?: unknown;
};

let mockColorPickerProps: ColorPickerProps;
let mockInputWidgetProps: InputWidgetProps;
let mockHueCircularProps: HueCircularProps;
let mockCompleteColor: ((color: ColorResult) => void) | undefined;

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({
    onSurface: '#111111',
    onSurfaceVariant: '#555555',
    outline: '#777777',
    outlineVariant: '#dddddd',
    primary: '#0066cc',
    surface: '#ffffff',
  }),
}));

jest.mock('@components', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    KeyboardAvoidingModal: ({
      children,
      onConfirm,
      onDismiss,
      onReset,
      title,
    }: {
      children: React.ReactNode;
      onConfirm: () => void;
      onDismiss: () => void;
      onReset: () => void;
      title: string;
    }) =>
      ReactModule.createElement(
        View,
        null,
        ReactModule.createElement(Text, null, title),
        children,
        ReactModule.createElement(Pressable, {
          testID: 'save',
          onPress: onConfirm,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'reset',
          onPress: onReset,
        }),
        ReactModule.createElement(Pressable, {
          testID: 'dismiss',
          onPress: onDismiss,
        }),
      ),
  };
});

jest.mock('react-native-paper', () => ({
  overlay: (_elevation: number, color: string) => `overlay(${color})`,
}));

jest.mock('reanimated-color-picker', () => {
  const ReactModule = jest.requireActual('react');
  const Color = jest.requireActual('color').default;
  const { Pressable, View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: (props: ColorPickerProps) => {
      mockColorPickerProps = props;
      mockCompleteColor = props.onCompleteJS;
      return ReactModule.createElement(
        View,
        { testID: 'color-picker' },
        props.children,
        ReactModule.createElement(Pressable, {
          testID: 'pick-color',
          onPress: () => mockCompleteColor?.({ hex: '#12ab34' }),
        }),
      );
    },
    colorKit: {
      setAlpha: (value: string, alpha: number) => ({
        hex: () => Color(value).alpha(alpha).hex(),
      }),
    },
    HueCircular: (props: HueCircularProps) => {
      mockHueCircularProps = props;
      return ReactModule.createElement(
        View,
        { testID: 'hue-circular' },
        props.children,
      );
    },
    InputWidget: (props: InputWidgetProps) => {
      mockInputWidgetProps = props;
      return ReactModule.createElement(
        View,
        { testID: 'input-widget' },
        ReactModule.createElement(Pressable, {
          testID: 'enter-valid-hex',
          onPress: () => mockCompleteColor?.({ hex: '#a1b2c3' }),
        }),
        ReactModule.createElement(Pressable, {
          testID: 'enter-invalid-hex',
        }),
      );
    },
    Panel1: () => ReactModule.createElement(View, { testID: 'panel-1' }),
    Preview: () => ReactModule.createElement(View, { testID: 'preview' }),
  };
});

describe('ColorPickerModal', () => {
  const defaultProps = {
    visible: true,
    title: 'Choose color',
    color: '#336699',
    closeModal: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['rgb(0, 87, 206)', '#0057ce'],
    ['#abc', '#aabbcc'],
    ['#ffffffb3', '#ffffff'],
  ])('normalizes %s to opaque HEX6', (color, expected) => {
    render(<ColorPickerModal {...defaultProps} color={color} />);

    expect(mockColorPickerProps.value).toBe(expected);
  });

  it('renders the circular picker and opaque HEX/RGB inputs', () => {
    render(<ColorPickerModal {...defaultProps} />);

    expect(screen.getByTestId('preview')).toBeTruthy();
    expect(screen.getByTestId('hue-circular')).toBeTruthy();
    expect(screen.getByTestId('panel-1')).toBeTruthy();
    expect(screen.getByTestId('input-widget')).toBeTruthy();
    expect(mockInputWidgetProps.disableAlphaChannel).toBe(true);
    expect(mockHueCircularProps.containerStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: 'overlay(#ffffff)' }),
      ]),
    );
  });

  it('submits the latest color selected by the circular picker', () => {
    const onSubmit = jest.fn();
    render(<ColorPickerModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('pick-color'));
    fireEvent.press(screen.getByTestId('save'));

    expect(onSubmit).toHaveBeenCalledWith('#12ab34');
  });

  it('syncs a valid HEX input and ignores an invalid one', () => {
    const onSubmit = jest.fn();
    render(<ColorPickerModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('enter-valid-hex'));
    fireEvent.press(screen.getByTestId('enter-invalid-hex'));
    fireEvent.press(screen.getByTestId('save'));

    expect(onSubmit).toHaveBeenCalledWith('#a1b2c3');
  });

  it('restores the current color after dismissing and reopening', () => {
    const closeModal = jest.fn();
    const view = render(
      <ColorPickerModal {...defaultProps} closeModal={closeModal} />,
    );

    fireEvent.press(screen.getByTestId('pick-color'));
    fireEvent.press(screen.getByTestId('dismiss'));

    expect(closeModal).toHaveBeenCalledTimes(1);

    view.rerender(
      <ColorPickerModal
        {...defaultProps}
        visible={false}
        closeModal={closeModal}
      />,
    );
    view.rerender(
      <ColorPickerModal {...defaultProps} closeModal={closeModal} />,
    );

    expect(mockColorPickerProps.value).toBe('#336699');
  });

  it('keeps the existing reset contract', () => {
    const onSubmit = jest.fn();
    render(<ColorPickerModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('pick-color'));
    fireEvent.press(screen.getByTestId('reset'));

    expect(onSubmit).toHaveBeenCalledWith(undefined);
    expect(mockColorPickerProps.value).toBe('#336699');
  });
});
