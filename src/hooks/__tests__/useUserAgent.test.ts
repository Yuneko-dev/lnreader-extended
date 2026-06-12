import { act, renderHook } from '@testing-library/react-native';

import { MMKVStorage } from '../../utils/mmkv/mmkv';
import useUserAgent from '../persisted/useUserAgent';

jest.mock('react-native-device-info', () => ({
  getUserAgentSync: jest.fn(() => 'MockDefaultUserAgent'),
}));

describe('useUserAgent', () => {
  beforeEach(() => {
    MMKVStorage.clearAll();
    jest.clearAllMocks();
  });

  it('should initialize with default user agent', () => {
    const { result } = renderHook(() => useUserAgent());
    expect(result.current.userAgent).toBe('MockDefaultUserAgent');
  });

  it('should set custom user agent', () => {
    const { result } = renderHook(() => useUserAgent());

    act(() => {
      result.current.setUserAgent('CustomUA123');
    });

    expect(result.current.userAgent).toBe('CustomUA123');
  });

  it('should remove custom user agent if it matches default', () => {
    const { result } = renderHook(() => useUserAgent());

    act(() => {
      result.current.setUserAgent('CustomUA123');
    });
    expect(result.current.userAgent).toBe('CustomUA123');

    act(() => {
      result.current.setUserAgent('MockDefaultUserAgent');
    });

    expect(result.current.userAgent).toBe('MockDefaultUserAgent');
  });

  it('should remove custom user agent if passed null or undefined', () => {
    const { result } = renderHook(() => useUserAgent());

    act(() => {
      result.current.setUserAgent('CustomUA123');
    });
    expect(result.current.userAgent).toBe('CustomUA123');

    act(() => {
      result.current.setUserAgent(undefined);
    });

    expect(result.current.userAgent).toBe('MockDefaultUserAgent');
  });
});
