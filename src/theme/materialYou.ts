import NativeMaterialYou, {
  DynamicColorPalette,
  MaterialYouConstants,
} from '@specs/NativeMaterialYou';
import { getString } from '@strings/translations';
import { darkThemes, lightThemes } from '@theme/md3';
import { ThemeColors } from '@theme/types';
import Color from 'color';

export const MATERIAL_YOU_THEME_ID = 10000;

export const isMaterialYouTheme = (theme: Pick<ThemeColors, 'id'>): boolean =>
  theme.id === MATERIAL_YOU_THEME_ID;

export interface MaterialYouThemes {
  light: ThemeColors;
  dark: ThemeColors;
}

export interface AvailableThemes {
  light: ThemeColors[];
  dark: ThemeColors[];
}

const PALETTE_KEYS: (keyof DynamicColorPalette)[] = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
];

const isValidPalette = (
  palette: DynamicColorPalette | undefined,
): palette is DynamicColorPalette =>
  Boolean(
    palette &&
      PALETTE_KEYS.every(
        key => typeof palette[key] === 'string' && palette[key].length > 0,
      ),
  );

const createTheme = (
  palette: DynamicColorPalette,
  baseTheme: ThemeColors,
  isDark: boolean,
): ThemeColors => ({
  ...baseTheme,
  ...palette,
  id: MATERIAL_YOU_THEME_ID,
  name: getString('appearanceScreen.theme.materialYou'),
  isDark,
  surfaceDisabled: Color(palette.onSurface).alpha(0.12).toString(),
  onSurfaceDisabled: Color(palette.onSurface).alpha(0.38).toString(),
  backdrop: Color(palette.onSurfaceVariant).alpha(0.4).toString(),
});

export const createMaterialYouThemes = (
  constants: MaterialYouConstants | null | undefined,
): MaterialYouThemes | null => {
  if (
    !constants?.isAvailable ||
    !isValidPalette(constants.light) ||
    !isValidPalette(constants.dark)
  ) {
    return null;
  }

  return {
    light: createTheme(constants.light, lightThemes[0], false),
    dark: createTheme(constants.dark, darkThemes[0], true),
  };
};

export const readMaterialYouThemes = (): MaterialYouThemes | null => {
  try {
    return createMaterialYouThemes(NativeMaterialYou?.getConstants());
  } catch {
    return null;
  }
};

export const buildAvailableThemes = (
  materialYouThemes: MaterialYouThemes | null,
): AvailableThemes => {
  if (!materialYouThemes) {
    return { light: lightThemes, dark: darkThemes };
  }

  return {
    light: [lightThemes[0], materialYouThemes.light, ...lightThemes.slice(1)],
    dark: [darkThemes[0], materialYouThemes.dark, ...darkThemes.slice(1)],
  };
};
