import { IconButtonV2 } from '@components';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NumericKey = Exclude<
  {
    [Key in keyof ChapterReaderSettings]: ChapterReaderSettings[Key] extends number
      ? Key
      : never;
  }[keyof ChapterReaderSettings],
  undefined
>;

type Props = {
  decimals?: number;
  label: string;
  max?: number;
  min: number;
  step: number;
  unit?: string;
  valueKey: NumericKey;
};

const ReaderValueControl = ({
  decimals = 0,
  label,
  max,
  min,
  step,
  unit = '',
  valueKey,
}: Props) => {
  const theme = useTheme();
  const { setChapterReaderSettings, ...settings } = useChapterReaderSettings();
  const value = settings[valueKey] as number;
  const update = (nextValue: number) =>
    setChapterReaderSettings({ [valueKey]: nextValue });
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
