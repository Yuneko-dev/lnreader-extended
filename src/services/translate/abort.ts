export const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw createAbortError();
};

export const abortableDelay = (
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> => {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
};
