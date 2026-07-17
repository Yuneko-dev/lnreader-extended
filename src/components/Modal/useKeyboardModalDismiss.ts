import { useCallback } from 'react';
import { Keyboard } from 'react-native';

const useKeyboardModalDismiss = (onDismiss: () => void) =>
  useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

export default useKeyboardModalDismiss;
