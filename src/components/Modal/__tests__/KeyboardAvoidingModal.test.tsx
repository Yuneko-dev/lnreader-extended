import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import KeyboardAvoidingModal from '../KeyboardAvoidingModal';

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardController: {
    dismiss: jest.fn(() => Promise.resolve()),
  },
}));

const mockButtonPresses = new Map<string, () => unknown>();

type MockButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => unknown;
};

type MockKeyboardAwareModalProps = {
  children?: React.ReactNode;
  dismissable?: boolean;
  dismissableBackButton?: boolean;
  footer?: React.ReactNode;
  title?: React.ReactNode;
};

jest.mock('@strings/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@components/Button/Button', () => {
  const ReactModule = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ children, disabled, loading, onPress }: MockButtonProps) => {
      if (onPress) mockButtonPresses.set(String(children), onPress);
      return ReactModule.createElement(
        View,
        {
          accessibilityState: { busy: loading, disabled },
          testID: String(children),
        },
        ReactModule.createElement(Text, null, children),
      );
    },
  };
});

jest.mock('../KeyboardAwareModal', () => {
  const ReactModule = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      children,
      dismissable,
      dismissableBackButton,
      footer,
      title,
    }: MockKeyboardAwareModalProps) =>
      ReactModule.createElement(
        View,
        {
          accessibilityState: { disabled: !dismissable },
          accessibilityValue: { text: String(dismissableBackButton) },
          testID: 'keyboard-aware-modal',
        },
        ReactModule.createElement(Text, null, title),
        children,
        footer,
      ),
  };
});

const confirmButton = () => screen.getByTestId('common.save');
const pressButton = (label: string) => mockButtonPresses.get(label)?.();

describe('KeyboardAvoidingModal', () => {
  beforeEach(() => {
    mockButtonPresses.clear();
  });

  it('dismisses exactly once after a successful confirm', async () => {
    const onConfirm = jest.fn(() => true);
    const onDismiss = jest.fn();

    render(
      <KeyboardAvoidingModal
        visible
        title="Form"
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );

    await act(async () => {
      await pressButton('common.save');
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open when confirm returns false', async () => {
    const onDismiss = jest.fn();

    render(
      <KeyboardAvoidingModal
        visible
        title="Form"
        onConfirm={() => false}
        onDismiss={onDismiss}
      />,
    );

    await act(async () => {
      await pressButton('common.save');
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(confirmButton().props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
  });

  it('locks every dismiss action and prevents duplicate async confirms', async () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveConfirm = resolve;
        }),
    );
    const onDismiss = jest.fn();

    render(
      <KeyboardAvoidingModal
        visible
        title="Form"
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onReset={jest.fn()}
      />,
    );

    let firstConfirm: Promise<void> | undefined;
    await act(async () => {
      firstConfirm = pressButton('common.save') as Promise<void>;
      pressButton('common.save');
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirmButton().props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    expect(
      screen.getByTestId('common.cancel').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('common.reset').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('keyboard-aware-modal').props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('keyboard-aware-modal').props.accessibilityValue.text,
    ).toBe('false');

    await act(async () => {
      resolveConfirm?.();
      await firstConfirm;
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('restores its loading state and propagates confirm errors', async () => {
    const error = new Error('confirm failed');
    const onDismiss = jest.fn();

    render(
      <KeyboardAvoidingModal
        visible
        title="Form"
        onConfirm={() => Promise.reject(error)}
        onDismiss={onDismiss}
      />,
    );

    let caughtError: unknown;
    await act(async () => {
      try {
        await pressButton('common.save');
      } catch (caught) {
        caughtError = caught;
      }
    });

    expect(caughtError).toBe(error);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(confirmButton().props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
  });

  it('runs reset without dismissing and cancel before one dismiss', async () => {
    const onReset = jest.fn();
    const onCancel = jest.fn();
    const onDismiss = jest.fn();

    render(
      <KeyboardAvoidingModal
        visible
        title="Form"
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
        onReset={onReset}
        onCancel={onCancel}
      />,
    );

    act(() => pressButton('common.reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => pressButton('common.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });
});
