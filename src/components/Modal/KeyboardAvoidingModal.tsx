import Button from '@components/Button/Button';
import { getString } from '@strings/translations';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import KeyboardAwareModal, {
  KeyboardAwareModalProps,
} from './KeyboardAwareModal';
import useKeyboardModalDismiss from './useKeyboardModalDismiss';

type ConfirmResult = boolean | void;

export type KeyboardAvoidingModalProps = {
  title: ReactNode;
  onConfirm: () => ConfirmResult | Promise<ConfirmResult>;
  onCancel?: () => void;
  onReset?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  resetLabel?: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
} & Omit<KeyboardAwareModalProps, 'footer' | 'title'>;

const KeyboardAvoidingModal: React.FC<KeyboardAvoidingModalProps> = ({
  visible,
  title,
  onDismiss,
  onConfirm,
  onCancel,
  onReset,
  confirmLabel = getString('common.save'),
  cancelLabel = getString('common.cancel'),
  resetLabel = getString('common.reset'),
  confirmDisabled = false,
  confirmLoading = false,
  dismissable,
  dismissableBackButton,
  ...props
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmingRef = useRef(false);
  const confirmRunRef = useRef(0);
  const busy = confirmLoading || isConfirming;
  const dismiss = useKeyboardModalDismiss(onDismiss);

  useEffect(() => {
    if (!visible) {
      confirmRunRef.current += 1;
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (confirmLoading || confirmingRef.current) return;

    confirmingRef.current = true;
    setIsConfirming(true);
    const runId = ++confirmRunRef.current;
    let dismissed = false;

    try {
      const result = await onConfirm();
      if (runId !== confirmRunRef.current) return;

      if (result !== false) {
        dismissed = true;
        dismiss();
      }
    } finally {
      if (runId === confirmRunRef.current && !dismissed) {
        confirmingRef.current = false;
        setIsConfirming(false);
      }
    }
  };

  const modalDismissable = (dismissable ?? true) && !busy;
  const modalDismissableBackButton =
    (dismissableBackButton ?? dismissable ?? true) && !busy;

  return (
    <KeyboardAwareModal
      {...props}
      visible={visible}
      title={title}
      onDismiss={onDismiss}
      dismissable={modalDismissable}
      dismissableBackButton={modalDismissableBackButton}
      footer={
        <View style={styles.buttonRow}>
          {onReset ? (
            <Button disabled={busy} onPress={onReset}>
              {resetLabel}
            </Button>
          ) : null}

          <View style={styles.flex} />

          <Button
            disabled={busy}
            onPress={() => {
              onCancel?.();
              dismiss();
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={confirmDisabled || busy}
            loading={busy}
            onPress={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </View>
      }
    />
  );
};

export default KeyboardAvoidingModal;

const styles = StyleSheet.create({
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: -8,
    marginHorizontal: -8,
    padding: 24,
    paddingTop: 8,
  },
  flex: {
    flex: 1,
  },
});
