import { act, renderHook } from '@testing-library/react-native';

import { useSearchHistory } from '../useSearchHistory';

let mockBooleanValue: boolean = true;
let mockObjectValue: string[] | undefined;
let mockIncognitoMode: boolean = false;

jest.mock('react-native-mmkv', () => {
  return {
    useMMKVBoolean: jest.fn(() => [
      mockBooleanValue,
      jest.fn(val => {
        mockBooleanValue =
          typeof val === 'function' ? val(mockBooleanValue) : val;
      }),
    ]),
    useMMKVObject: jest.fn(() => [
      mockObjectValue,
      jest.fn(val => {
        mockObjectValue =
          typeof val === 'function' ? val(mockObjectValue) : val;
      }),
    ]),
  };
});

jest.mock('@utils/mmkv/mmkv', () => ({
  getMMKVObject: jest.fn(() => ({ incognitoMode: mockIncognitoMode })),
}));

describe('useSearchHistory', () => {
  beforeEach(() => {
    mockBooleanValue = true;
    mockObjectValue = undefined;
    mockIncognitoMode = false;
    jest.clearAllMocks();
  });

  it('should initialize with empty array and enabled = true', () => {
    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.searchHistory).toEqual([]);
    expect(result.current.enableSearchHistory).toBe(true);
  });

  it('should add a search keyword properly', () => {
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearchKey('naruto');
    });

    rerender({});
    expect(mockObjectValue).toEqual(['naruto']);
  });

  it('should push new keywords to the beginning and remove duplicates', () => {
    mockObjectValue = ['bleach', 'one piece'];
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearchKey('one piece');
    });

    rerender({});
    expect(mockObjectValue).toEqual(['one piece', 'bleach']);
  });

  it('should not exceed max limit of 15', () => {
    mockObjectValue = Array.from({ length: 15 }, (_, i) => `keyword${i}`);
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearchKey('new keyword');
    });

    rerender({});
    expect(mockObjectValue?.length).toBe(15);
    expect(mockObjectValue?.[0]).toBe('new keyword');
    expect(mockObjectValue).not.toContain('keyword14');
  });

  it('should not add empty keywords', () => {
    mockObjectValue = ['naruto'];
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearchKey('   ');
    });

    rerender({});
    expect(mockObjectValue).toEqual(['naruto']); // No changes
  });

  it('should remove a search keyword', () => {
    mockObjectValue = ['naruto', 'bleach'];
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.removeSearchKey('naruto');
    });

    rerender({});
    expect(mockObjectValue).toEqual(['bleach']);
  });

  it('should clear all history', () => {
    mockObjectValue = ['naruto', 'bleach'];
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.clearHistory();
    });

    rerender({});
    expect(mockObjectValue).toEqual([]);
  });

  it('should respect enableSearchHistory toggle', () => {
    mockBooleanValue = false; // Disabled
    mockObjectValue = [];
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearchKey('naruto');
    });

    rerender({});
    expect(mockObjectValue).toEqual([]); // No changes because it's disabled
  });

  it('should respect incognitoMode toggle', () => {
    mockIncognitoMode = true; // Enabled incognito
    mockObjectValue = [];
    const { result, rerender } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearchKey('naruto');
    });

    rerender({});
    expect(mockObjectValue).toEqual([]); // No changes because of incognito
  });
});
