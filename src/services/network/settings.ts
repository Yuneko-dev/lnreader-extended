import NativeNetwork from '@specs/NativeNetwork';

export type NetworkMode = 'direct' | 'dpi_bypass';

export const getNetworkMode = (): NetworkMode =>
  NativeNetwork.getNetworkMode() === 'dpi_bypass' ? 'dpi_bypass' : 'direct';

export const setNetworkMode = (mode: NetworkMode) => {
  NativeNetwork.setNetworkMode(mode);
};
