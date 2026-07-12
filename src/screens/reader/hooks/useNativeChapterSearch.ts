import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard } from 'react-native';
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
  const [text, setText] = useState('');
  const [result, setResult] = useState(EMPTY_FIND_RESULT);
  const textRef = useRef('');

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

  const openSearch = useCallback(() => setVisible(true), []);

  const closeSearch = useCallback(() => {
    textRef.current = '';
    setText('');
    setResult(EMPTY_FIND_RESULT);
    setVisible(false);
    webViewRef.current?.clearMatches?.();
    Keyboard.dismiss();
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
      webViewRef.current?.clearMatches?.();
    },
    [webViewRef],
  );

  return {
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
