import {
  ChapterFilterKey,
  ChapterFilterPositiveKey,
  ChapterOrderKey,
} from '@database/constants';
import { ChapterFilterObject, FilterStates } from '@database/utils/filter';
import { useNovelAction, useNovelValue } from '@screens/novel/NovelContext';
import { useCallback, useMemo } from 'react';

import {
  defaultNovelSettings,
  NOVEL_PAGE_INDEX_PREFIX,
  NOVEL_SETTINGS_PREFIX,
} from './useNovel/types';
import { useAppSettings } from './useSettings';

export { NOVEL_PAGE_INDEX_PREFIX, NOVEL_SETTINGS_PREFIX };

export const useNovelSettings = () => {
  const { defaultChapterSort } = useAppSettings();
  const novel = useNovelValue('novel');
  const domainNovelSettings = useNovelValue('novelSettings');
  const writeNovelSettings = useNovelAction('setNovelSettings');

  const novelSettings = useMemo(
    () => ({ ...defaultNovelSettings, ...domainNovelSettings }),
    [domainNovelSettings],
  );

  const _sort: ChapterOrderKey = novelSettings.sort ?? defaultChapterSort;
  const _filter: ChapterFilterKey[] = novelSettings.filter;

  // #endregion
  // #region setters

  const setChapterSort = useCallback(
    async (sort: ChapterOrderKey) => {
      if (novel) {
        writeNovelSettings({
          showChapterTitles: novelSettings?.showChapterTitles,
          sort,
          filter: _filter,
        });
      }
    },
    [novel, writeNovelSettings, novelSettings?.showChapterTitles, _filter],
  );
  const setChapterFilter = useCallback(
    async (filter?: ChapterFilterKey[]) => {
      if (novel) {
        writeNovelSettings({
          showChapterTitles: novelSettings?.showChapterTitles,
          sort: _sort,
          filter: filter ?? [],
        });
      }
    },
    [novel, writeNovelSettings, novelSettings?.showChapterTitles, _sort],
  );

  const filterManager = useMemo(
    () => new ChapterFilterObject(_filter, setChapterFilter),
    [_filter, setChapterFilter],
  );

  const cycleChapterFilter = useCallback(
    (key: ChapterFilterPositiveKey) => {
      filterManager.cycle(key);
    },
    [filterManager],
  );

  const setChapterFilterValue = useCallback(
    (key: ChapterFilterPositiveKey, value: keyof FilterStates) => {
      filterManager.set(key, value);
    },
    [filterManager],
  );

  const getChapterFilterState = useCallback(
    (key: ChapterFilterPositiveKey) => {
      return filterManager.state(key) ?? false;
    },
    [filterManager],
  );

  const getChapterFilter = useCallback(
    (key: ChapterFilterPositiveKey) => filterManager.get(key),
    [filterManager],
  );

  const setShowChapterTitles = useCallback(
    (v: boolean) => {
      writeNovelSettings({ ...novelSettings, showChapterTitles: v });
    },
    [novelSettings, writeNovelSettings],
  );

  // #endregion

  return useMemo(
    () => ({
      ...novelSettings,
      cycleChapterFilter,
      setChapterFilter,
      setChapterFilterValue,
      getChapterFilterState,
      getChapterFilter,
      setChapterSort,
      setShowChapterTitles,
    }),
    [
      cycleChapterFilter,
      getChapterFilter,
      getChapterFilterState,
      novelSettings,
      setChapterFilter,
      setChapterFilterValue,
      setChapterSort,
      setShowChapterTitles,
    ],
  );
};
