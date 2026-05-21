import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  startServer: () => Promise<number>; // returns assigned port
  stopServer: () => Promise<void>;
  getServerUrl: () => string; // synchronous — returns 'http://127.0.0.1:PORT'
  setAllowProxyAPI: (allow: boolean) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeLocalServer');
