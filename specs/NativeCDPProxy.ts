import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  startProxy(): Promise<number>;
  stopProxy(): void;
  enableWebViewDebugging(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCDPProxy');
