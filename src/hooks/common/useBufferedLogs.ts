import type { BaseLogEntry, LogLevel } from '@components/LogViewer';
import { useCallback, useEffect, useRef, useState } from 'react';

const FLUSH_INTERVAL_MS = 100;
const MAX_LOG_ENTRIES = 1000;

export const useBufferedLogs = () => {
  const [logs, setLogs] = useState<BaseLogEntry[]>([]);
  const pendingLogsRef = useRef<BaseLogEntry[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);
  const mountedRef = useRef(true);

  const cancelScheduledFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const flushLogs = useCallback(() => {
    cancelScheduledFlush();

    if (!mountedRef.current) {
      pendingLogsRef.current = [];
      return;
    }

    if (pendingLogsRef.current.length === 0) {
      return;
    }

    const pendingLogs = pendingLogsRef.current;
    pendingLogsRef.current = [];
    setLogs(currentLogs =>
      [...currentLogs, ...pendingLogs].slice(-MAX_LOG_ENTRIES),
    );
  }, [cancelScheduledFlush]);

  const addLog = useCallback(
    (message: string, level: LogLevel = 'info') => {
      if (!mountedRef.current) {
        return;
      }

      pendingLogsRef.current.push({
        id: `${Date.now().toString(36)}-${nextIdRef.current++}`,
        message,
        timestamp: new Date(),
        level,
      });

      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flushLogs, FLUSH_INTERVAL_MS);
      }
    },
    [flushLogs],
  );

  const clearLogs = useCallback(() => {
    cancelScheduledFlush();
    pendingLogsRef.current = [];
    if (mountedRef.current) {
      setLogs([]);
    }
  }, [cancelScheduledFlush]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cancelScheduledFlush();
      pendingLogsRef.current = [];
    };
  }, [cancelScheduledFlush]);

  return { logs, addLog, clearLogs, flushLogs };
};

export default useBufferedLogs;
