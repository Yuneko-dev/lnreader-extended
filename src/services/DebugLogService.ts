/**
 * DebugLogService - Singleton service that intercepts console.log/warn/error
 * and buffers log entries for display in the Debug Log screen.
 */

import util from 'util';

export type LogLevel = 'log' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

type LogSubscriber = (entries: LogEntry[]) => void;

const MAX_ENTRIES = 200;
const NOTIFY_DEBOUNCE_MS = 100;

class DebugLogServiceClass {
  /** Ring buffer: fixed-size array, overwritten circularly */
  private buffer: (LogEntry | null)[] = new Array(MAX_ENTRIES).fill(null);
  /** Next write position in the ring buffer */
  private head = 0;
  /** Total entries ever written (also used as ID source) */
  private totalWritten = 0;
  private subscribers = new Set<LogSubscriber>();
  private installed = false;

  /** Cached snapshot — invalidated on write */
  private snapshotCache: LogEntry[] | null = null;

  /** Debounce timer for subscriber notifications */
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;

  // Store original console methods
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  /**
   * Install console interceptors. Safe to call multiple times.
   */
  install = () => {
    if (this.installed) {
      return;
    }
    this.installed = true;

    console.log = (...args: unknown[]) => {
      this.originalConsole.log(...args);
      this.addEntry('log', this.formatArgs(args));
    };

    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn(...args);
      this.addEntry('warn', this.formatArgs(args));
    };

    console.error = (...args: unknown[]) => {
      this.originalConsole.error(...args);
      this.addEntry('error', this.formatArgs(args));
    };

    console.info = (...args: unknown[]) => {
      this.originalConsole.info(...args);
      this.addEntry('info', this.formatArgs(args));
    };
  };

  private formatArgs(args: unknown[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        try {
          return util.inspect(arg, {
            showHidden: false,
            depth: 2,
            customInspect: true,
            maxStringLength: 500,
          });
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  /**
   * Add a log entry directly (useful for backup/restore logging).
   */
  addEntry(level: LogLevel, message: string) {
    const entry: LogEntry = {
      id: this.totalWritten++,
      timestamp: new Date(),
      level,
      message,
    };

    // Write to ring buffer (O(1), no allocation)
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % MAX_ENTRIES;

    // Invalidate cached snapshot
    this.snapshotCache = null;

    this.scheduleNotify();
  }

  /**
   * Get all current entries in chronological order.
   * Returns a cached snapshot when available to avoid redundant copies.
   */
  getEntries(): LogEntry[] {
    if (this.snapshotCache) {
      return this.snapshotCache;
    }

    const count = Math.min(this.totalWritten, MAX_ENTRIES);
    const result: LogEntry[] = new Array(count);

    // Read from ring buffer in chronological order
    // The oldest entry is at `head` (it was overwritten longest ago)
    for (let i = 0; i < count; i++) {
      const idx = (this.head - count + i + MAX_ENTRIES) % MAX_ENTRIES;
      result[i] = this.buffer[idx]!;
    }

    this.snapshotCache = result;
    return result;
  }

  /**
   * Clear all entries.
   */
  clear() {
    this.buffer.fill(null);
    this.head = 0;
    this.totalWritten = 0;
    this.snapshotCache = null;
    this.flushNotify();
  }

  /**
   * Get the next ID that will be assigned (useful for session tracking).
   */
  getNextId(): number {
    return this.totalWritten;
  }

  /**
   * Subscribe to log changes.
   */
  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Schedule a debounced notification to subscribers.
   * Batches rapid log bursts into a single UI update.
   */
  private scheduleNotify() {
    if (this.subscribers.size === 0) {
      return; // No subscribers, skip entirely
    }
    if (!this.notifyTimer) {
      this.notifyTimer = setTimeout(() => {
        this.flushNotify();
      }, NOTIFY_DEBOUNCE_MS);
    }
  }

  /**
   * Immediately flush pending notifications.
   */
  private flushNotify() {
    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
    }
    const entries = this.getEntries();
    this.subscribers.forEach(cb => cb(entries));
  }
}

const DebugLogService = new DebugLogServiceClass();
export default DebugLogService;
