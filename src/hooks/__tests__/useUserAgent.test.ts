import { act, renderHook } from '@testing-library/react-native';

import { MMKVStorage } from '../../utils/mmkv/mmkv';
import useUserAgent from '../persisted/useUserAgent';

const mockWebViewUserAgent =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36';
const inferredUserAgent =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

jest.mock('react-native-device-info', () => ({
  getUserAgentSync: jest.fn(() => mockWebViewUserAgent),
}));

describe('useUserAgent', () => {
  beforeEach(() => {
    MMKVStorage.clearAll();
    jest.clearAllMocks();
  });

  it('should initialize with default user agent', () => {
    const { result } = renderHook(() => useUserAgent());
    expect(result.current.userAgent).toBe(inferredUserAgent);
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
      result.current.setUserAgent(inferredUserAgent);
    });

    expect(result.current.userAgent).toBe(inferredUserAgent);
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

    expect(result.current.userAgent).toBe(inferredUserAgent);
  });
});
