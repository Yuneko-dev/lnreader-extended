import { KeyboardAvoidingModal } from '@components';
import { useTheme } from '@hooks/persisted';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { overlay } from 'react-native-paper';
import ColorPicker, {
  ColorFormatsObject,
  colorKit,
  HueCircular,
  InputWidget,
  Panel1,
  Preview,
} from 'reanimated-color-picker';

interface ColorPickerModalProps {
  visible: boolean;
  title: string;
  color: string;
  onSubmit: (val: string | undefined) => void;
  closeModal: () => void;
}

const toOpaqueHex = (color: string) =>
  colorKit.setAlpha(color, 1).hex().toLowerCase();

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  color,
  title,
  onSubmit,
  closeModal,
  visible,
}) => {
  const theme = useTheme();
  const [draftColor, setDraftColor] = useState(() => toOpaqueHex(color));

  useEffect(() => {
    if (visible) {
      setDraftColor(toOpaqueHex(color));
    }
  }, [color, visible]);

  const onDismiss = () => {
    setDraftColor(toOpaqueHex(color));
    closeModal();
  };

  const onColorComplete = ({ hex }: ColorFormatsObject) => {
    setDraftColor(toOpaqueHex(hex));
  };

  const onReset = () => {
    setDraftColor(toOpaqueHex(color));
    onSubmit(undefined);
  };

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={title}
      onDismiss={onDismiss}
      onConfirm={() => onSubmit(draftColor)}
      onReset={onReset}
    >
      <View style={styles.pickerContainer}>
        <ColorPicker
          value={draftColor}
          sliderThickness={20}
          thumbSize={28}
          thumbShape="pill"
          boundedThumb
          onCompleteJS={onColorComplete}
          colorAnnouncementFormat="hex"
          style={styles.picker}
        >
          <Preview style={styles.previewStyle} />
          <HueCircular
            accessibilityLabel="Hue"
            style={styles.hueCircular}
            containerStyle={[
              styles.hueContent,
              { backgroundColor: overlay(2, theme.surface) },
            ]}
          >
            <Panel1
              accessibilityLabel="Saturation and brightness"
              style={styles.panel}
            />
          </HueCircular>
          <View
            style={[styles.divider, { backgroundColor: theme.outlineVariant }]}
          />
          <InputWidget
            disableAlphaChannel
            containerStyle={styles.inputContainer}
            inputStyle={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.outline,
                color: theme.onSurface,
              },
            ]}
            inputTitleStyle={[
              styles.inputTitle,
              { color: theme.onSurfaceVariant },
            ]}
            inputProps={{
              autoCapitalize: 'characters',
              placeholder: '#RRGGBB',
              placeholderTextColor: theme.onSurfaceVariant,
              selectionColor: theme.primary,
            }}
            iconColor={theme.onSurfaceVariant}
          />
        </ColorPicker>
      </View>
    </KeyboardAvoidingModal>
  );
};

export default ColorPickerModal;

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  hueCircular: {
    maxWidth: 320,
    width: '100%',
  },
  hueContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputContainer: {
    width: '100%',
  },
  inputTitle: {
    fontSize: 12,
    paddingBottom: 0,
    paddingTop: 6,
  },
  panel: {
    alignSelf: 'center',
    borderRadius: 16,
    height: '68%',
    width: '68%',
  },
  picker: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: 320,
    width: '100%',
  },
  pickerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  previewStyle: {
    height: 40,
    borderRadius: 14,
  },
});
