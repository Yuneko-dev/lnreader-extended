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

const MAX_ENTRIES = 500;

class DebugLogServiceClass {
  private entries: LogEntry[] = [];
  private nextId = 0;
  private subscribers = new Set<LogSubscriber>();
  private installed = false;

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
            depth: 3,
            customInspect: true,
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
      id: this.nextId++,
      timestamp: new Date(),
      level,
      message,
    };

    this.entries.push(entry);

    // Trim to max entries
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }

    this.notifySubscribers();
  }

  /**
   * Get all current entries.
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all entries.
   */
  clear() {
    this.entries = [];
    this.notifySubscribers();
  }

  /**
   * Get the next ID that will be assigned (useful for session tracking).
   */
  getNextId(): number {
    return this.nextId;
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

  private notifySubscribers() {
    const entries = this.getEntries();
    this.subscribers.forEach(cb => cb(entries));
  }
}

const DebugLogService = new DebugLogServiceClass();
export default DebugLogService;
