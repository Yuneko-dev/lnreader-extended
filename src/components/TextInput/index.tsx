import React, {
  forwardRef,
  MutableRefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';

type StableTextInputProps = Omit<
  TextInputProps,
  'defaultValue' | 'selection' | 'value'
> & {
  value: string | undefined;
  defaultValue?: never;
  selection?: never;
};

/**
 * Keeps the native input uncontrolled while exposing a controlled-looking API.
 *
 * Text entered by the IME is not written back to native when the parent echoes it
 * through `value`. This preserves Android composing text, predictive suggestions,
 * and the native cursor. A genuinely external `value` change remounts only the
 * Paper input so resets, presets, and form hydration still update the field.
 */
const StableTextInput = forwardRef<RNTextInput, StableTextInputProps>(
  ({ onChangeText, value, ...props }, forwardedRef) => {
    const normalizedValue = value ?? '';
    const inputRef = useRef<RNTextInput | null>(null);
    const nativeValueRef = useRef(normalizedValue);
    const previousPropValueRef = useRef(normalizedValue);
    const restoreSelectionRef = useRef<number | null>(null);
    const [nativeInput, setNativeInput] = useState(() => ({
      defaultValue: normalizedValue,
      revision: 0,
    }));

    const assignRef = useCallback(
      (input: RNTextInput | null) => {
        inputRef.current = input;

        if (typeof forwardedRef === 'function') {
          forwardedRef(input);
        } else if (forwardedRef) {
          (forwardedRef as MutableRefObject<RNTextInput | null>).current =
            input;
        }
      },
      [forwardedRef],
    );

    const handleChangeText = useCallback(
      (text: string) => {
        nativeValueRef.current = text;
        onChangeText?.(text);
      },
      [onChangeText],
    );

    useLayoutEffect(() => {
      if (normalizedValue === previousPropValueRef.current) {
        return;
      }

      previousPropValueRef.current = normalizedValue;

      // onChangeText -> parent state -> value is only an echo of native text.
      // Avoid touching the input so Android can finish its composing transaction.
      if (normalizedValue === nativeValueRef.current) {
        return;
      }

      restoreSelectionRef.current = inputRef.current?.isFocused()
        ? normalizedValue.length
        : null;
      nativeValueRef.current = normalizedValue;
      setNativeInput(current => ({
        defaultValue: normalizedValue,
        revision: current.revision + 1,
      }));
    }, [normalizedValue]);

    useLayoutEffect(() => {
      const selection = restoreSelectionRef.current;
      if (selection == null) {
        return;
      }

      restoreSelectionRef.current = null;
      inputRef.current?.focus();
      inputRef.current?.setSelection(selection, selection);
    }, [nativeInput.revision]);

    return (
      <TextInput
        {...props}
        key={nativeInput.revision}
        ref={assignRef}
        defaultValue={nativeInput.defaultValue}
        onChangeText={handleChangeText}
      />
    );
  },
);

StableTextInput.displayName = 'StableTextInput';

export default StableTextInput;
