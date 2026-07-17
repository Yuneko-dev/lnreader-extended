import React, { forwardRef,useState } from 'react';
import {
  NativeSyntheticEvent,
  TextInput as RNTextInput,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';

interface SelectionState {
  start: number;
  end: number;
}

type StableTextInputProps = Omit<TextInputProps, 'defaultValue'> & {
  defaultValue?: never;
};

/**
 * StableTextInput is a custom component built on top of React Native Paper's TextInput, 
 * with a small patch to fix the cursor jumping issue when used as a controlled component (value).
 */
const StableTextInput = forwardRef<RNTextInput, StableTextInputProps>(
  ({ onSelectionChange, value, ...props }, ref) => {
    const [selection, setSelection] = useState<SelectionState | null>(null);

    const handleSelectionChange = (
      event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      setSelection(event.nativeEvent.selection);

      if (onSelectionChange) {
        onSelectionChange(event);
      }
    };

    const textLength = typeof value === 'string' ? value.length : 0;
    const safeSelection = selection
      ? {
          start: Math.min(selection.start, textLength),
          end: Math.min(selection.end, textLength),
        }
      : undefined;

    return (
      <TextInput
        ref={ref}
        value={value}
        selection={safeSelection}
        onSelectionChange={handleSelectionChange}
        {...props}
      />
    );
  },
);

StableTextInput.displayName = 'StableTextInput';

export default StableTextInput;
