import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Keyboard, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

import KeyboardAwareModal from '../KeyboardAwareModal';

type MockModalProps = {
  children?: React.ReactNode;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
};

type MockPortalProps = {
  children?: React.ReactNode;
};

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({ surface: '#ffffff', onSurface: '#111111' }),
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardController: {
    dismiss: jest.fn(() => Promise.resolve()),
  },
  useAnimatedKeyboard: () => ({
    height: { value: 0 },
    state: { value: 0 },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

jest.mock('react-native-paper', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');

  return {
    Modal: ({ children, onDismiss, style }: MockModalProps) =>
      ReactModule.createElement(
        View,
        { testID: 'paper-modal', style },
        children,
        ReactModule.createElement(Pressable, {
          testID: 'dismiss-modal',
          onPress: onDismiss,
        }),
      ),
    Portal: ({ children }: MockPortalProps) => children,
    overlay: (_level: number, color: string) => color,
  };
});

describe('KeyboardAwareModal', () => {
  const keyboardControllerDismiss =
    KeyboardController.dismiss as jest.MockedFunction<
      typeof KeyboardController.dismiss
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    keyboardControllerDismiss.mockReset();
    keyboardControllerDismiss.mockResolvedValue();
  });

  it('renders its regions, merges wrapper styles and centralizes dismiss', async () => {
    const onDismiss = jest.fn();

    render(
      <KeyboardAwareModal
        visible
        title="Modal title"
        footer={<Text>Modal footer</Text>}
        onDismiss={onDismiss}
        style={styles.transparent}
      >
        <Text>Modal body</Text>
      </KeyboardAwareModal>,
    );

    expect(screen.getByText('Modal title')).toBeTruthy();
    expect(screen.getByText('Modal body')).toBeTruthy();
    expect(screen.getByText('Modal footer')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('paper-modal').props.style),
    ).toMatchObject({
      justifyContent: 'center',
      opacity: 0.5,
      paddingHorizontal: 24,
    });

    fireEvent.press(screen.getByTestId('dismiss-modal'));

    await waitFor(() => {
      expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('dismisses the controller keyboard before hiding the modal', async () => {
    let resolveKeyboardDismiss: (() => void) | undefined;
    keyboardControllerDismiss.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveKeyboardDismiss = resolve;
        }),
    );
    const onDismiss = jest.fn();

    render(
      <KeyboardAwareModal visible onDismiss={onDismiss}>
        <Text>Modal body</Text>
      </KeyboardAwareModal>,
    );

    fireEvent.press(screen.getByTestId('dismiss-modal'));

    expect(keyboardControllerDismiss).toHaveBeenCalledWith({
      animated: false,
    });
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => resolveKeyboardDismiss?.());

    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('falls back when the controller keyboard never settles', async () => {
    jest.useFakeTimers();
    keyboardControllerDismiss.mockImplementation(() => new Promise(() => {}));
    const onDismiss = jest.fn();

    render(
      <KeyboardAwareModal visible onDismiss={onDismiss}>
        <Text>Modal body</Text>
      </KeyboardAwareModal>,
    );

    fireEvent.press(screen.getByTestId('dismiss-modal'));
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => jest.runAllTimers());

    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('ignores repeated dismiss requests while one is in flight', async () => {
    let resolveKeyboardDismiss: (() => void) | undefined;
    keyboardControllerDismiss.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveKeyboardDismiss = resolve;
        }),
    );
    const onDismiss = jest.fn();

    render(
      <KeyboardAwareModal visible onDismiss={onDismiss}>
        <Text>Modal body</Text>
      </KeyboardAwareModal>,
    );

    fireEvent.press(screen.getByTestId('dismiss-modal'));
    fireEvent.press(screen.getByTestId('dismiss-modal'));

    expect(keyboardControllerDismiss).toHaveBeenCalledTimes(1);

    await act(async () => resolveKeyboardDismiss?.());

    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('supports scrollable and non-scrollable content', () => {
    const view = render(
      <KeyboardAwareModal
        visible
        onDismiss={jest.fn()}
        scrollViewProps={{ testID: 'modal-scroll-view' }}
      >
        <Text>Scrollable body</Text>
      </KeyboardAwareModal>,
    );

    expect(screen.getByTestId('modal-scroll-view')).toBeTruthy();

    view.rerender(
      <KeyboardAwareModal
        visible
        scrollable={false}
        onDismiss={jest.fn()}
        scrollViewProps={{ testID: 'modal-scroll-view' }}
      >
        <Text>Static body</Text>
      </KeyboardAwareModal>,
    );

    expect(screen.queryByTestId('modal-scroll-view')).toBeNull();
    expect(screen.getByText('Static body')).toBeTruthy();
  });
});

const styles = StyleSheet.create({
  transparent: {
    opacity: 0.5,
  },
});
