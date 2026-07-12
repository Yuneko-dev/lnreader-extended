import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setDohProvider(providerId: string): void;
  setNetworkMode(mode: string): void;
  getNetworkMode(): string;
  isUserAgentValid(value: string): boolean;
  clearWebViewData(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeNetwork');
