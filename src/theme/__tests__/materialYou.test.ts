import type {
  DynamicColorPalette,
  MaterialYouConstants,
} from '@specs/NativeMaterialYou';
import {
  buildAvailableThemes,
  createMaterialYouThemes,
  isMaterialYouTheme,
  MATERIAL_YOU_THEME_ID,
} from '@theme/materialYou';
import { darkThemes, lightThemes } from '@theme/md3';

jest.mock('@specs/NativeMaterialYou', () => ({
  __esModule: true,
  default: null,
}));

const palette = (primary: string): DynamicColorPalette => ({
  primary,
  onPrimary: '#FFFFFF',
  primaryContainer: '#CCDDEE',
  onPrimaryContainer: '#112233',
  secondary: '#445566',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DDEEFF',
  onSecondaryContainer: '#223344',
  tertiary: '#665544',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFEEDD',
  onTertiaryContainer: '#332211',
  background: '#FAF8FC',
  onBackground: '#202124',
  surface: '#FAF8FC',
  onSurface: '#202124',
  surfaceVariant: '#E2E2EC',
  onSurfaceVariant: '#45464F',
  outline: '#767680',
  outlineVariant: '#C6C6D0',
  inverseSurface: '#303034',
  inverseOnSurface: '#F2F0F4',
  inversePrimary: '#B1C5FF',
});

const constants = (isAvailable = true): MaterialYouConstants => ({
  isAvailable,
  light: palette('#123456'),
  dark: palette('#ABCDEF'),
});

describe('Material You themes', () => {
  it('uses ID 10000 and inserts the theme after Default without changing existing IDs', () => {
    const materialYou = createMaterialYouThemes(constants());
    const available = buildAvailableThemes(materialYou);

    expect(materialYou?.light.id).toBe(MATERIAL_YOU_THEME_ID);
    expect(isMaterialYouTheme(materialYou!.light)).toBe(true);
    expect(available.light.slice(0, 2).map(theme => theme.id)).toEqual([
      100,
      MATERIAL_YOU_THEME_ID,
    ]);
    expect(available.dark.slice(0, 2).map(theme => theme.id)).toEqual([
      100,
      MATERIAL_YOU_THEME_ID,
    ]);
    expect(available.light.filter(theme => theme.id !== 10000)).toEqual(
      lightThemes,
    );
    expect(available.dark.filter(theme => theme.id !== 10000)).toEqual(
      darkThemes,
    );
  });

  it('does not expose Material You when native support is unavailable', () => {
    expect(createMaterialYouThemes(constants(false))).toBeNull();
    expect(buildAvailableThemes(null)).toEqual({
      light: lightThemes,
      dark: darkThemes,
    });
  });

  it('rejects an incomplete light or dark palette', () => {
    const incompleteLight = constants();
    incompleteLight.light.primary = '';
    const incompleteDark = constants();
    incompleteDark.dark.outlineVariant = '';

    expect(createMaterialYouThemes(incompleteLight)).toBeNull();
    expect(createMaterialYouThemes(incompleteDark)).toBeNull();
  });
});
