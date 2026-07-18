import {
  applyRegexReplacements,
  type CodeSnippet,
  compileRegex,
  composeCSS,
  composeJS,
  migrateLegacyCustomCode,
  type RegexReplacement,
  runRegexReplacement,
} from '../customCode';

const cssSnippets: CodeSnippet[] = [
  { name: 'first', code: 'body { color: red; }', lang: 'css', active: true },
  {
    name: 'disabled',
    code: 'body { color: blue; }',
    lang: 'css',
    active: false,
  },
  { name: 'last', code: 'p { margin: 0; }', lang: 'css', active: true },
];

describe('custom code snippets', () => {
  it('composes active CSS snippets in their stored order', () => {
    expect(composeCSS(cssSnippets)).toBe(
      'body { color: red; }\np { margin: 0; }',
    );
  });

  it('isolates active JavaScript snippets and excludes disabled code', () => {
    const result = composeJS([
      { name: 'first', code: 'html += "a";', lang: 'js', active: true },
      { name: 'syntax error', code: 'const = ;', lang: 'js', active: true },
      { name: 'early return', code: 'return;', lang: 'js', active: true },
      { name: 'off', code: 'html += "off";', lang: 'js', active: false },
      { name: 'last', code: 'html += "b";', lang: 'js', active: true },
    ]);
    const chapterElement = { innerHTML: '' };
    // Execute the generated WebView runner to verify snippet isolation.
    // eslint-disable-next-line no-new-func
    const execute = new Function(
      'chapterElement',
      'novelName',
      'chapterName',
      'sourceId',
      'chapterId',
      'novelId',
      result,
    );
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    execute(chapterElement, 'Novel', 'Chapter', 'source', 2, 1);

    expect(chapterElement.innerHTML).toBe('ab');
    expect(result).not.toContain('off');
    expect(result.match(/try \{/g)).toHaveLength(4);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('preserves direct DOM changes and safely serializes script endings', () => {
    const runtimeGlobal = globalThis as typeof globalThis & {
      customCodeTestElement?: { innerHTML: string };
    };
    const chapterElement = { innerHTML: 'start' };
    runtimeGlobal.customCodeTestElement = chapterElement;
    const result = composeJS([
      {
        name: '</script>',
        code: 'globalThis.customCodeTestElement.innerHTML += "-dom";',
        lang: 'js',
        active: true,
      },
      {
        name: 'html update',
        code: 'html += "</script>";',
        lang: 'js',
        active: true,
      },
    ]);
    // Execute the generated WebView runner to verify safe serialization.
    // eslint-disable-next-line no-new-func
    const execute = new Function(
      'chapterElement',
      'novelName',
      'chapterName',
      'sourceId',
      'chapterId',
      'novelId',
      result,
    );

    execute(chapterElement, 'Novel', 'Chapter', 'source', 2, 1);

    expect(chapterElement.innerHTML).toBe('start-dom</script>');
    expect(result).not.toContain('</script>');
    delete runtimeGlobal.customCodeTestElement;
  });
});

describe('legacy custom code migration', () => {
  it('converts both legacy fields without mutating existing snippets', () => {
    const existing: CodeSnippet = {
      name: 'existing',
      code: 'p { color: green; }',
      lang: 'css',
      active: false,
    };

    const result = migrateLegacyCustomCode({
      customCSS: 'body { color: red; }',
      customJS: 'html = html.trim();',
      codeSnippetsCSS: [existing],
      codeSnippetsJS: [],
    });

    expect(result.didMigrate).toBe(true);
    expect(result.settings).not.toHaveProperty('customCSS');
    expect(result.settings).not.toHaveProperty('customJS');
    expect(result.settings.codeSnippetsCSS).toEqual([
      existing,
      {
        name: 'Custom CSS',
        code: 'body { color: red; }',
        lang: 'css',
        active: true,
      },
    ]);
    expect(result.settings.codeSnippetsJS).toEqual([
      {
        name: 'Custom JS',
        code: 'html = html.trim();',
        lang: 'js',
        active: true,
      },
    ]);
  });

  it('does not duplicate legacy code that is already a snippet', () => {
    const existing: CodeSnippet = {
      name: 'Imported earlier',
      code: 'body { color: red; }',
      lang: 'css',
      active: false,
    };

    const result = migrateLegacyCustomCode({
      customCSS: existing.code,
      codeSnippetsCSS: [existing],
      codeSnippetsJS: [],
    });

    expect(result.didMigrate).toBe(true);
    expect(result.settings.codeSnippetsCSS).toEqual([existing]);
  });

  it('is a no-op after legacy fields have been removed', () => {
    const result = migrateLegacyCustomCode({
      codeSnippetsCSS: cssSnippets,
      codeSnippetsJS: [],
    });

    expect(result.didMigrate).toBe(false);
    expect(result.settings.codeSnippetsCSS).toBe(cssSnippets);
  });

  it('stays idempotent when the migrated settings are processed again', () => {
    const first = migrateLegacyCustomCode({
      customCSS: 'body { color: red; }',
      codeSnippetsCSS: [],
      codeSnippetsJS: [],
    });
    const second = migrateLegacyCustomCode(first.settings);

    expect(second.didMigrate).toBe(false);
    expect(second.settings.codeSnippetsCSS).toEqual(
      first.settings.codeSnippetsCSS,
    );
  });
});

describe('regex replacements', () => {
  it('compiles the supported JavaScript flags', () => {
    expect(compileRegex('hello', 'gimsuy').flags).toBe('gimsuy');
  });

  it('rejects unsupported or duplicate flags', () => {
    expect(() => compileRegex('hello', 'v')).toThrow('Unsupported regex flag');
    expect(() => compileRegex('hello', 'gg')).toThrow();
  });

  it('uses JavaScript capture replacement semantics', () => {
    const rule: RegexReplacement = {
      title: 'swap',
      pattern: '(first) (last)',
      flags: 'g',
      replacement: '$2, $1',
      active: true,
    };

    expect(runRegexReplacement('first last', rule)).toBe('last, first');

    expect(
      runRegexReplacement('hello Yuneko', {
        ...rule,
        pattern: 'hello (?<name>\\w+)',
        replacement: 'hi $<name>',
      }),
    ).toBe('hi Yuneko');
  });

  it('treats an empty replacement as removal', () => {
    const rule: RegexReplacement = {
      title: 'remove digits',
      pattern: '\\d+',
      flags: 'g',
      replacement: '',
      active: true,
    };

    expect(runRegexReplacement('a1 b22', rule)).toBe('a b');
  });

  it('applies active rules sequentially and skips invalid rules', () => {
    const rules: RegexReplacement[] = [
      {
        title: 'inactive',
        pattern: 'ignored',
        flags: 'g',
        replacement: 'bad',
        active: false,
      },
      {
        title: 'invalid',
        pattern: '[',
        flags: 'g',
        replacement: 'bad',
        active: true,
      },
      {
        title: 'first',
        pattern: 'cat',
        flags: 'gi',
        replacement: 'dog',
        active: true,
      },
      {
        title: 'second',
        pattern: 'dog',
        flags: '',
        replacement: 'fox',
        active: true,
      },
    ];

    expect(applyRegexReplacements('Cat cat ignored', rules)).toBe(
      'fox dog ignored',
    );
  });
});
