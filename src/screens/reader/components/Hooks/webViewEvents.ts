export type WebViewPostEvent = {
  type: string;
  data?: unknown;
  autoStartTTS?: boolean;
  index?: number;
  total?: number;
  initialScrollPosition?: 'start' | 'end';
  method?: string;
  args?: unknown[];
  msg?: string;
};

export const parseWebViewEvent = (payload: string): WebViewPostEvent | null => {
  try {
    const event: unknown = JSON.parse(payload);
    if (
      typeof event === 'object' &&
      event !== null &&
      'type' in event &&
      typeof event.type === 'string'
    ) {
      const value = event as Record<string, unknown>;
      return {
        type: event.type,
        data: value.data,
        autoStartTTS:
          typeof value.autoStartTTS === 'boolean'
            ? value.autoStartTTS
            : undefined,
        index: typeof value.index === 'number' ? value.index : undefined,
        total: typeof value.total === 'number' ? value.total : undefined,
        initialScrollPosition:
          value.initialScrollPosition === 'start' ||
          value.initialScrollPosition === 'end'
            ? value.initialScrollPosition
            : undefined,
        method: typeof value.method === 'string' ? value.method : undefined,
        args: Array.isArray(value.args) ? value.args : undefined,
        msg: typeof value.msg === 'string' ? value.msg : undefined,
      };
    }
  } catch {
    // Ignore messages that are not part of the reader bridge protocol.
  }
  return null;
};
