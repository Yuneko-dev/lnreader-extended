import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { History } from '@database/types';

import {
  deleteAllHistory,
  deleteChapterHistory,
  getHistoryFromDb,
} from '@database/queries/HistoryQueries';
import dayjs from 'dayjs';
import { parseChapterNumber } from '@utils/parseChapterNumber';

const useHistory = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<History[]>([]);
  const [error, setError] = useState<string>();

  const getHistory = useCallback(
    () =>
      getHistoryFromDb()
        .then(res =>
          setHistory(
            res.map(localHistory => {
              const parsedTime = dayjs(localHistory.releaseTime);
              return {
                ...localHistory,
                releaseTime: parsedTime.isValid()
                  ? parsedTime.format('LL')
                  : localHistory.releaseTime,
                chapterNumber: localHistory.chapterNumber
                  ? localHistory.chapterNumber
                  : parseChapterNumber(
                      localHistory.novelName,
                      localHistory.name,
                    ),
              };
            }),
          ),
        )
        .catch((err: Error) => setError(err.message))
        .finally(() => setIsLoading(false)),
    [],
  );

  const clearAllHistory = useCallback(async () => {
    await deleteAllHistory();
    await getHistory();
  }, [getHistory]);

  const removeChapterFromHistory = useCallback(
    async (chapterId: number) => {
      await deleteChapterHistory(chapterId);
      await getHistory();
    },
    [getHistory],
  );

  useFocusEffect(
    useCallback(() => {
      getHistory();
    }, [getHistory]),
  );

  return useMemo(
    () => ({
      isLoading,
      history,
      error,
      removeChapterFromHistory,
      clearAllHistory,
    }),
    [isLoading, history, error, removeChapterFromHistory, clearAllHistory],
  );
};

export default useHistory;
