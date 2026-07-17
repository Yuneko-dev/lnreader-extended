import { KeyboardAvoidingModal, StableTextInput } from '@components';
import React, { useState } from 'react';
import { FlatList, Pressable,StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '../../theme/types';

interface ColorPickerModalProps {
  visible: boolean;
  title: string;
  color: string;
  onSubmit: (val: string | undefined) => void;
  closeModal: () => void;
  theme: ThemeColors;
  showAccentColors?: boolean;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  theme,
  color,
  title,
  onSubmit,
  closeModal,
  visible,
  showAccentColors,
}) => {
  const [text, setText] = useState<string>(color);
  const [error, setError] = useState<string | null>();

  const onDismiss = () => {
    closeModal();
    setText(color);
    setError(null);
  };

  const onChangeText = (txt: string) => setText(txt);

  const handleConfirm = () => {
    const re = /^#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})$/i;

    if (text?.match(re)) {
      onSubmit(text);
    } else {
      setError('Enter a valid hex color code');
      return false;
    }
  };

  const onReset = () => {
    onSubmit(undefined);
    setText(color);
    setError(null);
  };

  const accentColors = [
    '#EF5350',
    '#EC407A',
    '#AB47BC',
    '#7E57C2',
    '#5C6BC0',
    '#42A5F5',
    '#29B6FC',
    '#26C6DA',
    '#26A69A',
    '#66BB6A',
    '#9CCC65',
    '#D4E157',
    '#FFEE58',
    '#FFCA28',
    '#FFA726',
    '#FF7043',
    '#8D6E63',
    '#BDBDBD',
    '#78909C',
    '#000000',
  ];

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={title}
      onDismiss={onDismiss}
      onConfirm={handleConfirm}
      onReset={onReset}
    >
      {showAccentColors ? (
        <FlatList
          contentContainerStyle={styles.marginBottom}
          data={accentColors}
          numColumns={4}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <View style={[styles.item, { backgroundColor: item }]}>
              <Pressable
                style={styles.flex}
                android_ripple={{
                  color: 'rgba(0,0,0,0.12)',
                }}
                onPress={() => {
                  setText(item);
                  setError(null);
                }}
              />
            </View>
          )}
        />
      ) : null}
      <StableTextInput
        value={text}
        placeholder="Hex Color Code (E.g. #3399FF)"
        onChangeText={onChangeText}
        mode="outlined"
        theme={{ colors: { ...theme } }}
        underlineColor={theme.outline}
        dense
        error={Boolean(error)}
      />
      <Text style={styles.errorText}>{error}</Text>
    </KeyboardAvoidingModal>
  );
};

export default ColorPickerModal;

const styles = StyleSheet.create({
  errorText: {
    color: '#FF0033',
    paddingTop: 8,
  },
  item: {
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1 / 4,
    height: 40,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  flex: { flex: 1 },
  marginBottom: { marginBottom: 8 },
});
