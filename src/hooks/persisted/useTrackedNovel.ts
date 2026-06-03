import { useCallback, useEffect, useMemo } from 'react';
import { useMMKVString, useMMKVObject } from 'react-native-mmkv';
import { SearchResult, TrackerName, UserListEntry } from '@services/Trackers';
import { TrackerMetadata, getTracker } from './useTracker';
import { getErrorMessage } from '@utils/error';
import { getMMKVObject, MMKVStorage } from '@utils/mmkv/mmkv';
import { showToast } from '@utils/showToast';

export const TRACKED_NOVEL_PREFIX = 'TRACKED_NOVEL_PREFIX';
const TRACKED_NOVEL_MIGRATION = 'TRACKED_NOVEL_MIGRATION_V1';

type TrackedNovel = SearchResult & UserListEntry;

const getTrackerStorageKey = (
  novelId: number | 'NO_ID',
  trackerName: TrackerName,
) => {
  if (novelId === 'NO_ID') return `DUMMY_KEY_NO_ID_${trackerName}`;
  return `${TRACKED_NOVEL_PREFIX}_${novelId}_${trackerName}`;
};

const getOldStorageKey = (novelId: number | 'NO_ID') => {
  return `${TRACKED_NOVEL_PREFIX}_${novelId}`;
};

export const useTrackedNovel = (novelId: number | 'NO_ID') => {
  const idStr = novelId === 'NO_ID' ? 'NO_ID' : String(novelId);
  const [migrated, setMigrated] = useMMKVString(
    `${TRACKED_NOVEL_MIGRATION}_${idStr}`,
  );

  const [aniList, setAniList] = useMMKVObject<TrackedNovel>(
    getTrackerStorageKey(novelId, 'AniList'),
  );
  const [myAnimeList, setMyAnimeList] = useMMKVObject<TrackedNovel>(
    getTrackerStorageKey(novelId, 'MyAnimeList'),
  );
  const [kitsu, setKitsu] = useMMKVObject<TrackedNovel>(
    getTrackerStorageKey(novelId, 'Kitsu'),
  );
  const [mangaUpdates, setMangaUpdates] = useMMKVObject<TrackedNovel>(
    getTrackerStorageKey(novelId, 'MangaUpdates'),
  );

  const trackedNovels = useMemo(() => {
    const loaded: Partial<Record<TrackerName, TrackedNovel>> = {};
    if (aniList) loaded.AniList = aniList;
    if (myAnimeList) loaded.MyAnimeList = myAnimeList;
    if (mangaUpdates) loaded.MangaUpdates = mangaUpdates;
    if (kitsu) loaded.Kitsu = kitsu;
    return loaded;
  }, [aniList, myAnimeList, mangaUpdates, kitsu]);

  /**
   * One-time migration from old single-tracker format if needed.
   */
  useEffect(() => {
    if (novelId === 'NO_ID') {
      return;
    }

    if (migrated !== 'true') {
      const oldKey = getOldStorageKey(novelId);
      const oldData = getMMKVObject<TrackedNovel>(oldKey);

      if (oldData) {
        MMKVStorage.remove(oldKey);
      }

      setMigrated('true');
    }
  }, [novelId, migrated, setMigrated]);

  const getTrackedNovel = useCallback(
    (trackerName: TrackerName): TrackedNovel | undefined => {
      return trackedNovels[trackerName];
    },
    [trackedNovels],
  );

  const isTrackedOn = useCallback(
    (trackerName: TrackerName): boolean => {
      return !!trackedNovels[trackerName];
    },
    [trackedNovels],
  );

  const getTrackedOn = useCallback((): TrackerName[] => {
    return Object.keys(trackedNovels) as TrackerName[];
  }, [trackedNovels]);

  const saveTrackerUpdate = useCallback(
    (trackerName: TrackerName, data: TrackedNovel | undefined) => {
      switch (trackerName) {
        case 'AniList':
          setAniList(data);
          break;
        case 'MyAnimeList':
          setMyAnimeList(data);
          break;
        case 'MangaUpdates':
          setMangaUpdates(data);
          break;
        case 'Kitsu':
          setKitsu(data);
          break;
      }
    },
    [setAniList, setMyAnimeList, setMangaUpdates, setKitsu],
  );

  const trackNovel = useCallback(
    (tracker: TrackerMetadata, novel: SearchResult) => {
      if (novelId === 'NO_ID') {
        return Promise.resolve();
      }

      return getTracker(tracker.name)
        .getUserListEntry(novel.id, tracker.auth)
        .then((data: UserListEntry) => {
          const trackedNovelData = {
            ...novel,
            ...data,
          };

          saveTrackerUpdate(tracker.name, trackedNovelData);
          return trackedNovelData;
        });
    },
    [novelId, saveTrackerUpdate],
  );

  const untrackNovel = useCallback(
    (trackerName: TrackerName) => {
      if (novelId === 'NO_ID') {
        return;
      }

      saveTrackerUpdate(trackerName, undefined);
    },
    [novelId, saveTrackerUpdate],
  );

  const updateTrackedNovel = useCallback(
    (tracker: TrackerMetadata, data: Partial<UserListEntry>) => {
      if (novelId === 'NO_ID') {
        return Promise.resolve();
      }

      const currentTrackedNovel = trackedNovels[tracker.name];
      if (!currentTrackedNovel) {
        return Promise.resolve();
      }

      const mergedPayload = {
        status: currentTrackedNovel.status,
        progress: currentTrackedNovel.progress,
        score: currentTrackedNovel.score,
        ...data,
      };

      return getTracker(tracker.name)
        .updateUserListEntry(
          currentTrackedNovel.id,
          mergedPayload,
          tracker.auth,
        )
        .then((res: UserListEntry) => {
          const updatedNovel = {
            ...currentTrackedNovel,
            progress: res.progress,
            score: res.score,
            status: res.status,
          };

          saveTrackerUpdate(tracker.name, updatedNovel);
          return updatedNovel;
        });
    },
    [novelId, trackedNovels, saveTrackerUpdate],
  );

  /**
   * Updates tracking information across all authenticated trackers
   * that are currently tracking this novel.
   * Updates are performed in parallel for better performance.
   */
  const updateAllTrackedNovels = useCallback(
    async (data: Partial<UserListEntry>) => {
      if (novelId === 'NO_ID') {
        return;
      }

      const trackersToUpdate = Object.keys(trackedNovels) as TrackerName[];

      if (trackersToUpdate.length === 0) {
        return;
      }

      const authenticatedTrackers =
        getMMKVObject<Partial<Record<TrackerName, any>>>('TRACKERS');

      const updatePromises = trackersToUpdate
        .filter(trackerName => authenticatedTrackers?.[trackerName])
        .map(async trackerName => {
          const currentTrackedNovel = trackedNovels[trackerName];
          const tracker = authenticatedTrackers![trackerName];

          if (!currentTrackedNovel || !tracker) {
            return;
          }

          const mergedPayload = {
            status: currentTrackedNovel.status,
            progress: currentTrackedNovel.progress,
            score: currentTrackedNovel.score,
            ...data,
          };

          try {
            const res = await getTracker(trackerName).updateUserListEntry(
              currentTrackedNovel.id,
              mergedPayload,
              tracker.auth,
            );

            const updatedNovel = {
              ...currentTrackedNovel,
              progress: res.progress,
              score: res.score,
              status: res.status,
            };

            saveTrackerUpdate(trackerName, updatedNovel);
          } catch (error) {
            showToast(
              `Failed to update ${trackerName}: ${getErrorMessage(error)}`,
            );
          }
        });

      await Promise.all(updatePromises);
    },
    [novelId, trackedNovels, saveTrackerUpdate],
  );

  const trackedNovel = useMemo(() => {
    const tracked = Object.values(trackedNovels)[0];
    return tracked;
  }, [trackedNovels]);

  const trackNovelCompat = useCallback(
    (tracker: TrackerMetadata, novel: SearchResult) => {
      return trackNovel(tracker, novel);
    },
    [trackNovel],
  );

  const untrackNovelCompat = useCallback(() => {
    const firstTracker = Object.keys(trackedNovels)[0] as TrackerName;
    if (firstTracker) {
      untrackNovel(firstTracker);
    }
  }, [trackedNovels, untrackNovel]);

  if (novelId === 'NO_ID') {
    return {
      trackedNovel: undefined,
      trackNovel: () => Promise.resolve(),
      untrackNovel: () => {},
      updateTrackedNovel: () => Promise.resolve(),
      trackedNovels: {},
      getTrackedNovel: () => undefined,
      isTrackedOn: () => false,
      getTrackedOn: () => [],
      trackNovelOn: () => Promise.resolve(),
      untrackNovelFrom: () => {},
      updateAllTrackedNovels: () => Promise.resolve(),
    };
  }

  return {
    trackedNovel,
    trackNovel: trackNovelCompat,
    untrackNovel: untrackNovelCompat,
    updateTrackedNovel,
    trackedNovels,
    getTrackedNovel,
    isTrackedOn,
    getTrackedOn,
    trackNovelOn: trackNovel,
    untrackNovelFrom: untrackNovel,
    updateAllTrackedNovels,
  };
};
