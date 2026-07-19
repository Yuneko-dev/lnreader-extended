import { useCallback, useRef } from 'react';
import { Keyboard } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

const KEYBOARD_DISMISS_TIMEOUT_MS = 250;

const dismissControllerKeyboard = async () => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      KeyboardController.dismiss({ animated: false }),
      new Promise<void>(resolve => {
        timeout = setTimeout(resolve, KEYBOARD_DISMISS_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // React Native's keyboard API remains the fallback.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const useKeyboardModalDismiss = (onDismiss: () => void) => {
  const dismissing = useRef(false);

  return useCallback(async () => {
    if (dismissing.current) return;
    dismissing.current = true;

    Keyboard.dismiss();
    await dismissControllerKeyboard();

    try {
      onDismiss();
    } finally {
      dismissing.current = false;
    }
  }, [onDismiss]);
};

export default useKeyboardModalDismiss;
