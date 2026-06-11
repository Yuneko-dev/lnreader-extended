import {
  getDetailedUpdatesFromDb,
  getUpdatedOverviewFromDb,
} from '@database/queries/ChapterQueries';
import { Update, UpdateOverview } from '@database/types';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';

export const SHOW_LAST_UPDATE_TIME = 'SHOW_LAST_UPDATE_TIME';
export const LAST_UPDATE_TIME = 'LAST_UPDATE_TIME';
export const NOVEL_UPDATE_RANDOM_KEY = 'NOVEL_UPDATE_RANDOM_KEY';

export const useLastUpdate = () => {
  const [showLastUpdateTime = true, setShowLastUpdateTime] = useMMKVBoolean(
    SHOW_LAST_UPDATE_TIME,
  );
  const [lastUpdateTime, setLastUpdateTime] = useMMKVString(LAST_UPDATE_TIME);
  const [novelUpdateRandomKey, setNovelUpdateRandomKey] = useMMKVString(
    NOVEL_UPDATE_RANDOM_KEY,
  );
  return {
    lastUpdateTime,
    showLastUpdateTime,
    setLastUpdateTime,
    setShowLastUpdateTime,
    novelUpdateRandomKey,
    setNovelUpdateRandomKey,
  };
};

export const useUpdates = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [updatesOverview, setUpdatesOverview] = useState<UpdateOverview[]>([]);

  const { lastUpdateTime, showLastUpdateTime, novelUpdateRandomKey } =
    useLastUpdate();
  const [error, setError] = useState('');

  const getDetailedUpdates = useCallback(
    async (
      novelId: number,
      updateDate?: string,
      onlyDownloadedChapters: boolean = false,
    ) => {
      setIsLoading(true);

      let result: Update[] = await getDetailedUpdatesFromDb(
        novelId,
        updateDate,
        onlyDownloadedChapters,
      );
      result = result.map(update => {
        const parsedTime = dayjs(update.releaseTime);
        return {
          ...update,
          releaseTime: parsedTime.isValid()
            ? parsedTime.format('LL')
            : update.releaseTime,
        };
      });
      setIsLoading(false);
      return result;
    },
    [],
  );

  const getUpdates = useCallback(async () => {
    setIsLoading(true);
    getUpdatedOverviewFromDb()
      .then(res => {
        setUpdatesOverview(res);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    getUpdates();
  }, [novelUpdateRandomKey, getUpdates]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      // ? Push updates to the end of the stack to avoid lag
      setTimeout(async () => {
        await getUpdates();
        setIsLoading(false);
      }, 0);
    }, [getUpdates]),
  );

  return useMemo(
    () => ({
      isLoading,
      updatesOverview,
      getUpdates,
      getDetailedUpdates,
      lastUpdateTime,
      showLastUpdateTime,
      error,
    }),
    [
      isLoading,
      updatesOverview,
      getUpdates,
      getDetailedUpdates,
      lastUpdateTime,
      showLastUpdateTime,
      error,
    ],
  );
};
