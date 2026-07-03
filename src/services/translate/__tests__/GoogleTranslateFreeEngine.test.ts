import { GoogleTranslateFreeEngine } from '../GoogleTranslateFreeEngine';

const response = (status: number, data: unknown = []) =>
  ({
    json: jest.fn().mockResolvedValue(data),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response);

describe('GoogleTranslateFreeEngine lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stops after the configured number of rate-limit retries', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(429));

    const translation = new GoogleTranslateFreeEngine().translate(
      ['hello'],
      'en',
      'vi',
    );
    await jest.runAllTimersAsync();
    await translation;

    expect(global.fetch).toHaveBeenCalledTimes(6);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('aborts a pending rate-limit delay and removes its timer', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(429));
    const controller = new AbortController();
    const translation = new GoogleTranslateFreeEngine().translate(
      ['hello'],
      'en',
      'vi',
      undefined,
      controller.signal,
    );
    await Promise.resolve();

    controller.abort();

    await expect(translation).rejects.toMatchObject({ name: 'AbortError' });
    expect(jest.getTimerCount()).toBe(0);
  });
});
