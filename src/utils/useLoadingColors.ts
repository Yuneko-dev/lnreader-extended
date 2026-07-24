import { ThemeColors } from '@theme/types';
import color from 'color';
import { useAppSettings } from '@hooks/persisted';
import { interpolateColor } from 'react-native-reanimated';
import { useMemo } from 'react';

export const getLoadingColors = (
  theme: ThemeColors,
  disableLoadingAnimations = false,
) => {
  const highlightColor = color(theme.primary).alpha(0.08).string();
  const backgroundColor = color(theme.surface);

  let adjustedBackgroundColor;

  if (backgroundColor.isDark()) {
    adjustedBackgroundColor =
      backgroundColor.luminosity() !== 0
        ? backgroundColor.lighten(0.1).toString()
        : backgroundColor.negate().darken(0.98).toString();
  } else {
    adjustedBackgroundColor = backgroundColor.darken(0.04).toString();
  }

  if (disableLoadingAnimations) {
    // The highlight is hidden, so increase the static placeholder contrast.
    adjustedBackgroundColor = interpolateColor(
      0.01,
      [0, 1],
      [adjustedBackgroundColor, highlightColor],
    );
  }

  return [highlightColor, adjustedBackgroundColor] as const;
};

const useLoadingColors = (theme: ThemeColors) => {
  const { disableLoadingAnimations } = useAppSettings();
  const colors = useMemo(
    () => getLoadingColors(theme, disableLoadingAnimations),
    [disableLoadingAnimations, theme],
  );

  return [...colors, disableLoadingAnimations] as const;
};

export default useLoadingColors;
