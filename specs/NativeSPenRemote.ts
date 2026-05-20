import { Platform, TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setActive: (active: boolean) => void;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
}

const NativeSPenRemote =
  Platform.OS === 'android'
    ? TurboModuleRegistry.get<Spec>('NativeSPenRemote')
    : null;

export default NativeSPenRemote;
