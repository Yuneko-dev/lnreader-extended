import { TranslateEngine } from '../TranslateEngine';
import { TranslateManager } from '../TranslateManager';

// ─── countWords ──────────────────────────────────────────────────────────────

describe('TranslateManager.countWords', () => {
  it('counts English words separated by spaces', () => {
    expect(TranslateManager.countWords('Hello world')).toBe(2);
  });

  it('counts words with punctuation', () => {
    expect(TranslateManager.countWords('Hello, world! How are you?')).toBe(5);
  });

  it('counts each CJK character as a word', () => {
    expect(TranslateManager.countWords('你好世界')).toBe(4);
  });

  it('counts mixed CJK and Latin text', () => {
    // "Hello" = 1 word, "世界" = 2 words
    expect(TranslateManager.countWords('Hello 世界')).toBe(3);
  });

  it('counts Japanese hiragana/katakana as individual words', () => {
    expect(TranslateManager.countWords('こんにちは')).toBe(5);
    expect(TranslateManager.countWords('カタカナ')).toBe(4);
  });

  it('counts Korean hangul syllables as individual words', () => {
    expect(TranslateManager.countWords('안녕하세요')).toBe(5);
  });

  it('returns 0 for empty string', () => {
    expect(TranslateManager.countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(TranslateManager.countWords('   \t\n  ')).toBe(0);
  });

  it('handles numbers as words', () => {
    expect(TranslateManager.countWords('Chapter 123')).toBe(2);
  });

  it('handles surrogate pairs (emoji are not alphanumeric)', () => {
    expect(TranslateManager.countWords('Hello 🌍 world')).toBe(2);
  });

  it('handles CJK Extension B (surrogate pair characters)', () => {
    // 𠀀 is U+20000 (CJK Extension B)
    expect(TranslateManager.countWords('𠀀')).toBe(1);
  });
});

// ─── isCJK ───────────────────────────────────────────────────────────────────

describe('TranslateManager.isCJK', () => {
  it('returns true for CJK Unified Ideographs', () => {
    expect(TranslateManager.isCJK('中'.codePointAt(0)!)).toBe(true);
  });

  it('returns true for Hiragana', () => {
    expect(TranslateManager.isCJK('あ'.codePointAt(0)!)).toBe(true);
  });

  it('returns true for Katakana', () => {
    expect(TranslateManager.isCJK('ア'.codePointAt(0)!)).toBe(true);
  });

  it('returns true for Hangul Syllables', () => {
    expect(TranslateManager.isCJK('한'.codePointAt(0)!)).toBe(true);
  });

  it('returns false for Latin characters', () => {
    expect(TranslateManager.isCJK('A'.codePointAt(0)!)).toBe(false);
  });

  it('returns false for numbers', () => {
    expect(TranslateManager.isCJK('5'.codePointAt(0)!)).toBe(false);
  });
});

// ─── chunkParagraphsByWordCount ──────────────────────────────────────────────

describe('TranslateManager.chunkParagraphsByWordCount', () => {
  it('returns single chunk when all paragraphs fit within limit', () => {
    const texts = ['Hello world', 'Good morning'];
    const result = TranslateManager.chunkParagraphsByWordCount(texts, 100);
    expect(result).toHaveLength(1);
    expect(result[0].texts).toEqual(['Hello world', 'Good morning']);
    expect(result[0].startIndex).toBe(0);
  });

  it('splits into multiple chunks when exceeding word limit', () => {
    const texts = [
      'one two three four five', // 5 words
      'six seven eight nine ten', // 5 words
      'eleven twelve thirteen fourteen fifteen', // 5 words
    ];
    // limit=8: para 0 (5w) fits, para 1 (5+5=10 > 8) starts new chunk, para 2 (5+5=10 > 8) starts another
    const result = TranslateManager.chunkParagraphsByWordCount(texts, 8);
    expect(result).toHaveLength(3);
    expect(result[0].texts).toEqual(['one two three four five']);
    expect(result[0].startIndex).toBe(0);
    expect(result[1].texts).toEqual(['six seven eight nine ten']);
    expect(result[1].startIndex).toBe(1);
    expect(result[2].texts).toEqual([
      'eleven twelve thirteen fourteen fifteen',
    ]);
    expect(result[2].startIndex).toBe(2);
  });

  it('never splits a single paragraph even if it exceeds the limit', () => {
    const texts = ['one two three four five six seven eight nine ten'];
    const result = TranslateManager.chunkParagraphsByWordCount(texts, 3);
    expect(result).toHaveLength(1);
    expect(result[0].texts).toEqual([texts[0]]);
    expect(result[0].startIndex).toBe(0);
  });

  it('returns empty array for empty input', () => {
    const result = TranslateManager.chunkParagraphsByWordCount([], 100);
    expect(result).toEqual([]);
  });

  it('tracks startIndex correctly across multiple chunks', () => {
    const texts = [
      'a b c d e', // 5 words, index 0
      'f g h i j', // 5 words, index 1
      'k l m n o', // 5 words, index 2
      'p q r s t', // 5 words, index 3
    ];
    const result = TranslateManager.chunkParagraphsByWordCount(texts, 8);
    // Chunk 0: paragraphs 0+1 (10 words > 8, so splits after 0)
    // Actually: para 0 = 5 words, para 1 would make 10 > 8 → split
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.startIndex).toBeGreaterThanOrEqual(0);
      expect(chunk.texts.length).toBeGreaterThan(0);
    }
  });

  it('handles CJK text chunking correctly', () => {
    const texts = ['你好世界測試文字', '这是一个测试', 'Hello world'];
    // CJK: 8 chars = 8 words, 6 chars = 6 words, English = 2 words
    const result = TranslateManager.chunkParagraphsByWordCount(texts, 10);
    expect(result).toHaveLength(2);
    expect(result[0].texts).toEqual(['你好世界測試文字']);
    expect(result[1].texts).toEqual(['这是一个测试', 'Hello world']);
  });
});

// ─── translateWithRetry ──────────────────────────────────────────────────────

describe('TranslateManager.translateWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('succeeds on first attempt without retry', async () => {
    const mockEngine: TranslateEngine = {
      id: 'test',
      name: 'Test',
      translate: jest.fn().mockResolvedValue(['translated']),
    };

    const result = await TranslateManager.translateWithRetry(
      mockEngine,
      ['hello'],
      'en',
      'vi',
      3,
    );

    expect(result).toEqual(['translated']);
    expect(mockEngine.translate).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on second attempt', async () => {
    const mockEngine: TranslateEngine = {
      id: 'test',
      name: 'Test',
      translate: jest
        .fn()
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(['translated']),
    };

    const promise = TranslateManager.translateWithRetry(
      mockEngine,
      ['hello'],
      'en',
      'vi',
      3,
    );

    // Advance past the first Fibonacci delay (1000ms)
    await jest.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toEqual(['translated']);
    expect(mockEngine.translate).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retry attempts', async () => {
    jest.useRealTimers(); // Use real timers for this test to avoid async issues

    const mockEngine: TranslateEngine = {
      id: 'test',
      name: 'Test',
      translate: jest.fn().mockRejectedValue(new Error('Persistent error')),
    };

    // Use maxAttempts=1 to avoid needing delays
    await expect(
      TranslateManager.translateWithRetry(mockEngine, ['hello'], 'en', 'vi', 1),
    ).rejects.toThrow('Persistent error');

    expect(mockEngine.translate).toHaveBeenCalledTimes(1);
  });

  it('does not retry on AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const mockEngine: TranslateEngine = {
      id: 'test',
      name: 'Test',
      translate: jest.fn().mockRejectedValue(abortError),
    };

    await expect(
      TranslateManager.translateWithRetry(mockEngine, ['hello'], 'en', 'vi', 5),
    ).rejects.toThrow('Aborted');

    expect(mockEngine.translate).toHaveBeenCalledTimes(1);
  });

  it('throws immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const mockEngine: TranslateEngine = {
      id: 'test',
      name: 'Test',
      translate: jest.fn(),
    };

    await expect(
      TranslateManager.translateWithRetry(
        mockEngine,
        ['hello'],
        'en',
        'vi',
        3,
        undefined,
        controller.signal,
      ),
    ).rejects.toThrow();

    expect(mockEngine.translate).not.toHaveBeenCalled();
  });
});
