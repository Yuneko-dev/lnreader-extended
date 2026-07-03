import type { TurboModule } from 'react-native';
import { Platform, TurboModuleRegistry } from 'react-native';

export interface DynamicColorPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
}

export interface MaterialYouConstants {
  isAvailable: boolean;
  light: DynamicColorPalette;
  dark: DynamicColorPalette;
}

export interface Spec extends TurboModule {
  getConstants(): MaterialYouConstants;
}

const NativeMaterialYou =
  Platform.OS === 'android'
    ? TurboModuleRegistry.get<Spec>('NativeMaterialYou')
    : null;

export default NativeMaterialYou;
