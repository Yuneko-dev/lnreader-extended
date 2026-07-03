import { act, renderHook } from '@testing-library/react-native';
import React, { StrictMode } from 'react';

import useBufferedLogs from '../useBufferedLogs';

describe('useBufferedLogs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('buffers entries and flushes them in order every 100 ms', () => {
    const { result } = renderHook(() => useBufferedLogs());

    act(() => {
      result.current.addLog('first');
      result.current.addLog('second', 'warn');
    });

    expect(result.current.logs).toEqual([]);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.logs.map(entry => entry.message)).toEqual([
      'first',
      'second',
    ]);
    expect(result.current.logs[1].level).toBe('warn');
  });

  it('keeps only the latest 1000 entries', () => {
    const { result } = renderHook(() => useBufferedLogs());

    act(() => {
      for (let index = 0; index < 1005; index++) {
        result.current.addLog(`entry-${index}`);
      }
      jest.advanceTimersByTime(100);
    });

    expect(result.current.logs).toHaveLength(1000);
    expect(result.current.logs[0].message).toBe('entry-5');
    expect(result.current.logs[999].message).toBe('entry-1004');
  });

  it('can flush immediately and clear pending entries', () => {
    const { result } = renderHook(() => useBufferedLogs());

    act(() => {
      result.current.addLog('pending');
      result.current.flushLogs();
    });
    expect(result.current.logs[0].message).toBe('pending');

    act(() => {
      result.current.addLog('discarded');
      result.current.clearLogs();
      jest.advanceTimersByTime(100);
    });
    expect(result.current.logs).toEqual([]);
  });

  it('cancels its scheduled flush when unmounted', () => {
    const { result, unmount } = renderHook(() => useBufferedLogs());

    act(() => {
      result.current.addLog('pending');
    });
    expect(jest.getTimerCount()).toBe(1);

    unmount();
    expect(jest.getTimerCount()).toBe(0);

    act(() => {
      result.current.addLog('after unmount');
      result.current.flushLogs();
      result.current.clearLogs();
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps at most one timer and clears it across repeated sessions', () => {
    const { result } = renderHook(() => useBufferedLogs());

    act(() => {
      for (let index = 0; index < 50; index++) {
        result.current.addLog(`entry-${index}`);
      }
    });
    expect(jest.getTimerCount()).toBe(1);

    act(() => {
      result.current.clearLogs();
    });
    expect(jest.getTimerCount()).toBe(0);

    act(() => {
      result.current.addLog('new session');
      result.current.flushLogs();
    });
    expect(jest.getTimerCount()).toBe(0);
    expect(result.current.logs.map(entry => entry.message)).toEqual([
      'new session',
    ]);
  });

  it('survives Strict Mode effect cleanup without retaining timers', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(StrictMode, null, children);
    const { result, unmount } = renderHook(() => useBufferedLogs(), {
      wrapper,
    });

    act(() => {
      result.current.addLog('strict mode');
    });
    expect(jest.getTimerCount()).toBe(1);

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
