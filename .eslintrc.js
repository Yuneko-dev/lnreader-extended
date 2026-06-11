module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  plugins: ['react-compiler', 'simple-import-sort', 'unused-imports'],
  overrides: [
    {
      // Test files only
      plugins: ['jest'],
      files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      extends: ['plugin:testing-library/react', 'plugin:jest/recommended'],
    },
    {
      files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
      rules: {
        // --- React & React Native Base ---
        'react-compiler/react-compiler': 'error',
        '@react-native/no-deep-imports': 0,

        // --- Import Sorting & Unused Imports ---
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',

        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],

        // --- Typescript & Variables ---
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-var': 'error',
        'no-undef': 'off',
        'prefer-const': 'error',
        'block-scoped-var': 'error',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'warn',

        // --- Destructuring & Operators ---
        'prefer-destructuring': [
          'error',
          {
            VariableDeclarator: { array: false, object: true },
            AssignmentExpression: { array: false, object: false },
          },
        ],
        'operator-assignment': ['error', 'always'],
        'no-unneeded-ternary': ['error', { defaultAssignment: false }],
        'eqeqeq': ['error', 'always', { null: 'ignore' }],

        // --- Control Structures ---
        'curly': ['error', 'multi-line', 'consistent'],
        'yoda': 'error',
        'no-lonely-if': 'error',
        'no-dupe-else-if': 'error',
        'no-useless-return': 'error',
        'no-fallthrough': 'error',

        // --- Code Safety & Bug Prevention ---
        'no-duplicate-imports': 'error',
        'no-useless-escape': 'error',
        'no-unreachable': 'error',
        'no-invalid-regexp': 'error',
        'no-constant-condition': ['error', { checkLoops: false }],
        'no-async-promise-executor': 'error',
        'no-cond-assign': 'error',
        'no-duplicate-case': 'error',
        'no-irregular-whitespace': 'error',
        'no-loss-of-precision': 'error',
        'no-misleading-character-class': 'error',
        'no-prototype-builtins': 'error',
        'no-regex-spaces': 'error',
        'no-shadow-restricted-names': 'error',
        'no-unexpected-multiline': 'error',
        'no-unsafe-optional-chaining': 'error',
        'no-useless-backreference': 'error',
        'use-isnan': 'error',
        'prefer-spread': 'error',

        // --- Limits & Comments ---
        'max-nested-callbacks': ['error', { max: 5 }],
        'spaced-comment': ['error', 'always', { markers: ['!'] }],
        'no-inline-comments': 'warn',
        'no-console': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
  ],
};
