import { addReadDuration } from '@database/queries/ChapterQueries';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export default function useReadingTime(chapterId: number) {
  const isTTSReadingRef = useRef(false);
  const readStartTimeRef = useRef<number | null>(null);
  const accumulatedReadTimeRef = useRef(0);
  const chapterIdRef = useRef(chapterId);

  const start = useCallback(() => {
    if (readStartTimeRef.current === null && !isTTSReadingRef.current) {
      readStartTimeRef.current = Date.now();
    }
  }, []);

  const pause = useCallback(() => {
    if (readStartTimeRef.current !== null) {
      accumulatedReadTimeRef.current += Math.floor(
        (Date.now() - readStartTimeRef.current) / 1000,
      );
      readStartTimeRef.current = null;
    }
  }, []);

  const save = useCallback(
    (id: number) => {
      pause();
      const totalSeconds = accumulatedReadTimeRef.current;
      if (totalSeconds > 0) {
        addReadDuration(id, totalSeconds).catch(() => {});
        accumulatedReadTimeRef.current = 0;
      }
    },
    [pause],
  );

  const setTTSReading = useCallback(
    (isReading: boolean) => {
      const wasReading = isTTSReadingRef.current;
      isTTSReadingRef.current = isReading;
      if (isReading && !wasReading) {
        pause();
      } else if (!isReading && wasReading) {
        start();
      }
    },
    [pause, start],
  );

  const stopTTSForBackground = useCallback(() => {
    isTTSReadingRef.current = false;
  }, []);

  useEffect(() => {
    start();
    return () => save(chapterIdRef.current);
  }, [save, start]);

  useEffect(() => {
    if (chapterIdRef.current !== chapterId) {
      save(chapterIdRef.current);
      chapterIdRef.current = chapterId;
      start();
    }
  }, [chapterId, save, start]);

  return useMemo(
    () => ({
      isTTSReadingRef,
      start,
      pause,
      setTTSReading,
      stopTTSForBackground,
    }),
    [pause, setTTSReading, start, stopTTSForBackground],
  );
}
