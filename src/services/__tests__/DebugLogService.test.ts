import { DebugLogServiceClass } from '../DebugLogService';

describe('DebugLogService subscriptions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancels a pending notification when the last subscriber leaves', () => {
    const service = new DebugLogServiceClass();
    const subscriber = jest.fn();
    const unsubscribe = service.subscribe(subscriber);

    service.addEntry('info', 'pending');
    expect(jest.getTimerCount()).toBe(1);

    unsubscribe();
    expect(jest.getTimerCount()).toBe(0);

    jest.runOnlyPendingTimers();
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('keeps notifying while another subscriber remains', () => {
    const service = new DebugLogServiceClass();
    const firstSubscriber = jest.fn();
    const secondSubscriber = jest.fn();
    const unsubscribeFirst = service.subscribe(firstSubscriber);
    service.subscribe(secondSubscriber);

    service.addEntry('info', 'pending');
    unsubscribeFirst();
    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(100);
    expect(firstSubscriber).not.toHaveBeenCalled();
    expect(secondSubscriber).toHaveBeenCalledTimes(1);
  });
});
