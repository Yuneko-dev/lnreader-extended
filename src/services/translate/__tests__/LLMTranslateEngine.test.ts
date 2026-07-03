import { LLMCoreClient } from '../../ai/LLMCoreClient';
import { LLMTranslateEngine } from '../LLMTranslateEngine';

const MARKER = '<br>';

const makeMockClient = (
  overrides: Partial<
    Pick<LLMCoreClient, 'generateContent' | 'generateTranslateContent'>
  > = {},
) =>
  ({
    endpoint: '',
    apiKey: '',
    model: '',
    fetchModels: jest.fn(),
    generateContent: jest.fn(),
    generateTranslateContent: jest.fn(),
    ...overrides,
  } as unknown as LLMCoreClient);

// ─── Structured output (default) ─────────────────────────────────────────────

describe('LLMTranslateEngine — structured output (default)', () => {
  it('calls generateTranslateContent with JSON.stringify(texts) as userPrompt', async () => {
    const client = makeMockClient({
      generateTranslateContent: jest
        .fn()
        .mockResolvedValue({ data: { paragraphs: ['translated'] } }),
    });
    await new LLMTranslateEngine(client, {}).translate(['hello'], 'en', 'vi');

    expect(client.generateTranslateContent).toHaveBeenCalledTimes(1);
    const opts = (client.generateTranslateContent as jest.Mock).mock
      .calls[0][0];
    expect(opts.userPrompt).toBe(JSON.stringify(['hello']));
    expect(opts.schema).toBeDefined();
  });

  it('does not call generateContent', async () => {
    const client = makeMockClient({
      generateTranslateContent: jest
        .fn()
        .mockResolvedValue({ data: { paragraphs: ['translated'] } }),
    });
    await new LLMTranslateEngine(client, {}).translate(['hello'], 'en', 'vi');
    expect(client.generateContent).not.toHaveBeenCalled();
  });

  it('system prompt contains JSON constraint', async () => {
    const client = makeMockClient({
      generateTranslateContent: jest
        .fn()
        .mockResolvedValue({ data: { paragraphs: ['x'] } }),
    });
    await new LLMTranslateEngine(client, {}).translate(['hello'], 'en', 'vi');
    const opts = (client.generateTranslateContent as jest.Mock).mock
      .calls[0][0];
    expect(opts.systemInstruction).toContain('valid JSON object');
  });

  it('system prompt says "text array"', async () => {
    const client = makeMockClient({
      generateTranslateContent: jest
        .fn()
        .mockResolvedValue({ data: { paragraphs: ['x'] } }),
    });
    await new LLMTranslateEngine(client, {}).translate(['hello'], 'en', 'vi');
    const opts = (client.generateTranslateContent as jest.Mock).mock
      .calls[0][0];
    expect(opts.systemInstruction).toContain('text array');
  });

  it('pads short response to match input count', async () => {
    const client = makeMockClient({
      generateTranslateContent: jest
        .fn()
        .mockResolvedValue({ data: { paragraphs: ['one'] } }),
    });
    const result = await new LLMTranslateEngine(client, {}).translate(
      ['a', 'b', 'c'],
      'en',
      'vi',
    );
    expect(result).toEqual(['one', '', '']);
  });

  it('truncates oversized response to match input count', async () => {
    const client = makeMockClient({
      generateTranslateContent: jest
        .fn()
        .mockResolvedValue({ data: { paragraphs: ['a', 'b', 'c', 'd'] } }),
    });
    const result = await new LLMTranslateEngine(client, {}).translate(
      ['x', 'y'],
      'en',
      'vi',
    );
    expect(result).toEqual(['a', 'b']);
  });

  it('returns [] for empty input without calling client', async () => {
    const client = makeMockClient();
    const result = await new LLMTranslateEngine(client, {}).translate(
      [],
      'en',
      'vi',
    );
    expect(result).toEqual([]);
    expect(client.generateTranslateContent).not.toHaveBeenCalled();
    expect(client.generateContent).not.toHaveBeenCalled();
  });
});

// ─── Marker-based fallback (disableStructuredOutput=true) ────────────────────

describe('LLMTranslateEngine — marker-based (disableStructuredOutput=true)', () => {
  it('calls generateContent, not generateTranslateContent', async () => {
    const client = makeMockClient({
      generateContent: jest.fn().mockResolvedValue({ text: 'ciao' }),
    });
    await new LLMTranslateEngine(client, {
      disableStructuredOutput: true,
    }).translate(['hello'], 'en', 'vi');
    expect(client.generateContent).toHaveBeenCalledTimes(1);
    expect(client.generateTranslateContent).not.toHaveBeenCalled();
  });

  it('userPrompt joins texts with marker', async () => {
    const client = makeMockClient({
      generateContent: jest.fn().mockResolvedValue({
        text: `para one\n${MARKER}\npara two`,
      }),
    });
    await new LLMTranslateEngine(client, {
      disableStructuredOutput: true,
    }).translate(['hello', 'world'], 'en', 'vi');
    const opts = (client.generateContent as jest.Mock).mock.calls[0][0];
    expect(opts.userPrompt).toBe(`hello\n${MARKER}\nworld`);
  });

  it('system prompt contains marker constraint, not JSON constraint', async () => {
    const client = makeMockClient({
      generateContent: jest.fn().mockResolvedValue({ text: 'x' }),
    });
    await new LLMTranslateEngine(client, {
      disableStructuredOutput: true,
    }).translate(['hello'], 'en', 'vi');
    const opts = (client.generateContent as jest.Mock).mock.calls[0][0];
    expect(opts.systemInstruction).toContain(MARKER);
    expect(opts.systemInstruction).not.toContain('valid JSON object');
  });

  it('system prompt says "text from", not "text array from"', async () => {
    const client = makeMockClient({
      generateContent: jest.fn().mockResolvedValue({ text: 'x' }),
    });
    await new LLMTranslateEngine(client, {
      disableStructuredOutput: true,
    }).translate(['hello'], 'en', 'vi');
    const opts = (client.generateContent as jest.Mock).mock.calls[0][0];
    expect(opts.systemInstruction).toMatch(/Translate the following text from/);
    expect(opts.systemInstruction).not.toContain('text array');
  });

  it('splits response by marker and trims whitespace', async () => {
    const client = makeMockClient({
      generateContent: jest.fn().mockResolvedValue({
        text: `  para one  \n${MARKER}\n  para two  `,
      }),
    });
    const result = await new LLMTranslateEngine(client, {
      disableStructuredOutput: true,
    }).translate(['hello', 'world'], 'en', 'vi');
    expect(result).toEqual(['para one', 'para two']);
  });

  it('returns [] for empty input without calling client', async () => {
    const client = makeMockClient();
    const result = await new LLMTranslateEngine(client, {
      disableStructuredOutput: true,
    }).translate([], 'en', 'vi');
    expect(result).toEqual([]);
    expect(client.generateContent).not.toHaveBeenCalled();
  });
});

describe('LLMTranslateEngine — lifecycle', () => {
  it('preserves AbortError and clears its progress interval', async () => {
    jest.useFakeTimers();
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const client = makeMockClient({
      generateTranslateContent: jest.fn().mockRejectedValue(abortError),
    });

    await expect(
      new LLMTranslateEngine(client, {}).translate(['hello'], 'en', 'vi'),
    ).rejects.toBe(abortError);
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
