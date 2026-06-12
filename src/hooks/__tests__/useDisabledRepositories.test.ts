import { act, renderHook } from '@testing-library/react-native';

import { MMKVStorage } from '../../utils/mmkv/mmkv';
import useDisabledRepositories from '../persisted/useDisabledRepositories';

describe('useDisabledRepositories', () => {
  beforeEach(() => {
    MMKVStorage.clearAll();
  });

  it('should initialize with an empty array', () => {
    const { result } = renderHook(() => useDisabledRepositories());
    expect(result.current.disabledRepositories).toEqual([]);
  });

  it('should toggle a repository id correctly', () => {
    const { result } = renderHook(() => useDisabledRepositories());

    act(() => {
      result.current.toggleDisabledRepository(1);
    });
    expect(result.current.disabledRepositories).toEqual([1]);

    act(() => {
      result.current.toggleDisabledRepository(2);
    });
    expect(result.current.disabledRepositories).toEqual([1, 2]);

    act(() => {
      result.current.toggleDisabledRepository(1);
    });
    expect(result.current.disabledRepositories).toEqual([2]);

    act(() => {
      result.current.toggleDisabledRepository(2);
    });
    expect(result.current.disabledRepositories).toEqual([]);
  });
});
