import { IconButtonV2 } from '@components';
import { useTheme } from '@hooks/persisted';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  decimals?: number;
  label: string;
  max?: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit?: string;
  value: number;
};

const ReaderValueControl = ({
  decimals = 0,
  label,
  max,
  min,
  onChange,
  step,
  unit = '',
  value,
}: Props) => {
  const theme = useTheme();
  const update = (nextValue: number) => {
    const upperBoundedValue =
      max == null ? nextValue : Math.min(max, nextValue);
    const clampedValue = Math.max(min, upperBoundedValue);
    onChange(Number(clampedValue.toFixed(decimals)));
  };
  const increase = () =>
    update(max == null ? value + step : Math.min(max, value + step));

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.onSurface }]}>{label}</Text>
      <View style={styles.controls}>
        <IconButtonV2
          name="minus"
          color={theme.primary}
          disabled={value <= min}
          onPress={() => update(Math.max(min, value - step))}
          size={24}
          theme={theme}
        />
        <Text
          style={[styles.value, { color: theme.onSurface }]}
        >{`${value.toFixed(decimals)}${unit}`}</Text>
        <IconButtonV2
          name="plus"
          color={theme.primary}
          disabled={max != null && value >= max}
          onPress={increase}
          size={24}
          theme={theme}
        />
      </View>
    </View>
  );
};

export default ReaderValueControl;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  controls: { alignItems: 'center', flexDirection: 'row' },
  label: { flex: 1, fontSize: 16 },
  value: { minWidth: 62, textAlign: 'center' },
});
