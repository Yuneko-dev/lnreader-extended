import { act, renderHook, waitFor } from '@testing-library/react-native';
import type WebView from 'react-native-webview';

import { useNativeChapterSearch } from '../useNativeChapterSearch';

const mockDismiss = jest.fn<Promise<void>, []>();

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardController: {
    dismiss: () => mockDismiss(),
  },
}));

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
};

const setup = () => {
  const webViewRef = {
    current: {
      clearMatches: jest.fn(),
      findAllAsync: jest.fn(),
      findNext: jest.fn(),
    },
  } as unknown as React.RefObject<WebView | null>;

  return renderHook(() => useNativeChapterSearch(webViewRef));
};

describe('useNativeChapterSearch keyboard lifecycle', () => {
  it('keeps keyboard avoidance active until the keyboard finishes hiding', async () => {
    const dismissal = createDeferred();
    mockDismiss.mockReturnValue(dismissal.promise);
    const { result } = setup();

    act(() => result.current.openSearch());
    expect(result.current.keyboardAvoidanceActive).toBe(true);

    act(() => result.current.closeSearch());
    expect(result.current.visible).toBe(false);
    expect(result.current.keyboardAvoidanceActive).toBe(true);

    await act(async () => {
      dismissal.resolve();
      await dismissal.promise;
    });

    await waitFor(() =>
      expect(result.current.keyboardAvoidanceActive).toBe(false),
    );
  });

  it('does not disable keyboard avoidance when search reopens during dismissal', async () => {
    const dismissal = createDeferred();
    mockDismiss.mockReturnValue(dismissal.promise);
    const { result } = setup();

    act(() => result.current.openSearch());
    act(() => result.current.closeSearch());
    act(() => result.current.openSearch());

    await act(async () => {
      dismissal.resolve();
      await dismissal.promise;
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.keyboardAvoidanceActive).toBe(true);
  });
});
