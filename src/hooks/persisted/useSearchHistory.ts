import { useCallback } from 'react';
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv';

export const SEARCH_HISTORY_KEY = 'SEARCH_HISTORY';
export const ENABLE_SEARCH_HISTORY_KEY = 'ENABLE_SEARCH_HISTORY';

const EMPTY_ARRAY: string[] = [];

export const useSearchHistory = () => {
  const [enableSearchHistory = true, setEnableSearchHistory] = useMMKVBoolean(
    ENABLE_SEARCH_HISTORY_KEY,
  );

  const [searchHistoryRaw, setSearchHistory] =
    useMMKVObject<string[]>(SEARCH_HISTORY_KEY);
  const searchHistory = searchHistoryRaw || EMPTY_ARRAY;

  const addSearchKey = useCallback(
    (keyword: string) => {
      if (!enableSearchHistory) {
        return;
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        return;
      }

      setSearchHistory(prev => {
        const currentArray = prev || [];
        return [trimmed, ...currentArray.filter(k => k !== trimmed)].slice(
          0,
          15,
        );
      });
    },
    [enableSearchHistory, setSearchHistory],
  );

  const removeSearchKey = useCallback(
    (keyword: string) => {
      setSearchHistory(prev => {
        const currentArray = prev || [];
        return currentArray.filter(k => k !== keyword);
      });
    },
    [setSearchHistory],
  );

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, [setSearchHistory]);

  return {
    searchHistory,
    enableSearchHistory,
    setEnableSearchHistory,
    addSearchKey,
    removeSearchKey,
    clearHistory,
  };
};
