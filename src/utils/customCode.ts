export type CodeSnippet = {
  name: string;
  code: string;
  lang: 'css' | 'js';
  active: boolean;
};

export type RegexReplacement = {
  title: string;
  pattern: string;
  flags: string;
  replacement: string;
  active: boolean;
};

export const REGEX_FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const;

type LegacyCustomCodeSettings = {
  customCSS?: string;
  customJS?: string;
  codeSnippetsCSS?: CodeSnippet[];
  codeSnippetsJS?: CodeSnippet[];
};

type MigratedCustomCodeSettings<T extends LegacyCustomCodeSettings> = Omit<
  T,
  'customCSS' | 'customJS' | 'codeSnippetsCSS' | 'codeSnippetsJS'
> & {
  codeSnippetsCSS: CodeSnippet[];
  codeSnippetsJS: CodeSnippet[];
};

type LegacyCustomCodeMigration<T extends LegacyCustomCodeSettings> = {
  settings: MigratedCustomCodeSettings<T>;
  didMigrate: boolean;
};

const appendLegacySnippet = (
  snippets: CodeSnippet[],
  code: string | undefined,
  lang: CodeSnippet['lang'],
): CodeSnippet[] => {
  if (
    !code?.trim() ||
    snippets.some(snippet => snippet.code.trim() === code.trim())
  ) {
    return snippets;
  }

  return [
    ...snippets,
    {
      name: lang === 'css' ? 'Custom CSS' : 'Custom JS',
      code,
      lang,
      active: true,
    },
  ];
};

export const migrateLegacyCustomCode = <T extends LegacyCustomCodeSettings>(
  settings: T,
): LegacyCustomCodeMigration<T> => {
  const hasLegacyCSS = Object.prototype.hasOwnProperty.call(
    settings,
    'customCSS',
  );
  const hasLegacyJS = Object.prototype.hasOwnProperty.call(
    settings,
    'customJS',
  );
  const {
    customCSS,
    customJS,
    codeSnippetsCSS = [],
    codeSnippetsJS = [],
    ...settingsWithoutLegacyCode
  } = settings;

  return {
    settings: {
      ...settingsWithoutLegacyCode,
      codeSnippetsCSS: appendLegacySnippet(codeSnippetsCSS, customCSS, 'css'),
      codeSnippetsJS: appendLegacySnippet(codeSnippetsJS, customJS, 'js'),
    } as MigratedCustomCodeSettings<T>,
    didMigrate: hasLegacyCSS || hasLegacyJS,
  };
};

export const composeCSS = (snippets: CodeSnippet[]): string =>
  snippets
    .filter(snippet => snippet.active)
    .map(snippet => snippet.code)
    .join('\n');

export const serializeInlineScriptValue = (value: unknown): string =>
  JSON.stringify(value)?.replace(/</g, '\\u003c') ?? 'undefined';

export const composeJS = (snippets: CodeSnippet[]): string =>
  snippets
    .filter(snippet => snippet.active)
    .map(
      snippet => `try {
  const previousHtml = chapterElement.innerHTML;
  const executeSnippet = new Function(
    'html',
    'novelName',
    'chapterName',
    'sourceId',
    'chapterId',
    'novelId',
    ${serializeInlineScriptValue(`${snippet.code}\nreturn html;`)},
  );
  const nextHtml = executeSnippet(
    previousHtml,
    novelName,
    chapterName,
    sourceId,
    chapterId,
    novelId,
  );
  if (typeof nextHtml === 'string' && nextHtml !== previousHtml) {
    chapterElement.innerHTML = nextHtml;
  }
} catch (error) {
  console.error(${serializeInlineScriptValue(
    `Custom snippet "${snippet.name}" failed`,
  )}, error);
}`,
    )
    .join('\n');

export const compileRegex = (pattern: string, flags: string): RegExp => {
  const unsupportedFlag = [...flags].find(
    flag => !REGEX_FLAGS.includes(flag as (typeof REGEX_FLAGS)[number]),
  );
  if (unsupportedFlag) {
    throw new Error(`Unsupported regex flag: ${unsupportedFlag}`);
  }

  return new RegExp(pattern, flags);
};

export const runRegexReplacement = (
  input: string,
  rule: RegexReplacement,
): string =>
  input.replace(compileRegex(rule.pattern, rule.flags), rule.replacement);

export const applyRegexReplacements = (
  input: string,
  rules: RegexReplacement[],
): string =>
  rules.reduce((result, rule) => {
    if (!rule.active || !rule.pattern) return result;

    try {
      return runRegexReplacement(result, rule);
    } catch {
      return result;
    }
  }, input);
