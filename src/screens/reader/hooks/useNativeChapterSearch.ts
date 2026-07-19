import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { KeyboardController } from 'react-native-keyboard-controller';
import WebView from 'react-native-webview';

export type NativeFindResult = {
  query: string;
  current: number;
  total: number;
  isDoneCounting: boolean;
};

const EMPTY_FIND_RESULT: NativeFindResult = {
  query: '',
  current: 0,
  total: 0,
  isDoneCounting: true,
};

export type NativeChapterSearch = ReturnType<typeof useNativeChapterSearch>;

export const useNativeChapterSearch = (
  webViewRef: RefObject<WebView | null>,
) => {
  const [visible, setVisible] = useState(false);
  const [keyboardAvoidanceActive, setKeyboardAvoidanceActive] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState(EMPTY_FIND_RESULT);
  const textRef = useRef('');
  const keyboardLifecycleRef = useRef(0);

  const setSearchText = useCallback(
    (query: string) => {
      textRef.current = query;
      setText(query);
      setResult({
        query,
        current: 0,
        total: 0,
        isDoneCounting: !query,
      });
      if (query) {
        webViewRef.current?.findAllAsync?.(query);
      } else {
        webViewRef.current?.clearMatches?.();
      }
    },
    [webViewRef],
  );

  const openSearch = useCallback(() => {
    keyboardLifecycleRef.current += 1;
    setKeyboardAvoidanceActive(true);
    setVisible(true);
  }, []);

  const closeSearch = useCallback(() => {
    const keyboardLifecycle = ++keyboardLifecycleRef.current;
    textRef.current = '';
    setText('');
    setResult(EMPTY_FIND_RESULT);
    setVisible(false);
    webViewRef.current?.clearMatches?.();
    KeyboardController.dismiss().finally(() => {
      if (keyboardLifecycleRef.current === keyboardLifecycle) {
        setKeyboardAvoidanceActive(false);
      }
    });
  }, [webViewRef]);

  const findNext = useCallback(
    (forward: boolean) => {
      webViewRef.current?.findNext?.(forward);
    },
    [webViewRef],
  );

  const handleFindResult = useCallback((nextResult: NativeFindResult) => {
    if (nextResult.query === textRef.current) {
      setResult(nextResult);
    }
  }, []);

  useEffect(
    () => () => {
      keyboardLifecycleRef.current += 1;
      webViewRef.current?.clearMatches?.();
    },
    [webViewRef],
  );

  return {
    keyboardAvoidanceActive,
    visible,
    text,
    result,
    openSearch,
    closeSearch,
    setSearchText,
    findNext,
    handleFindResult,
  };
};
