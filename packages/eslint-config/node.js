import antfu from '@antfu/eslint-config';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export const getNodeConfig = (antfuOptions = {}) =>
  antfu(
    {
      lessOpinionated: true,
      stylistic: false,
      ...antfuOptions,
    },
    {
      rules: {
        'ts/no-explicit-any': 'error',
        'ts/consistent-type-imports': 'off',
        'node/prefer-global/process': 'off',
        curly: 'off',
        'no-console': [
          'error',
          {
            allow: ['warn', 'error'],
          },
        ],
        'unused-imports/no-unused-vars': [
          'error',
          {
            caughtErrors: 'none',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      plugins: {
        'simple-import-sort': simpleImportSort,
      },
      rules: {
        'perfectionist/sort-imports': 'off',
        'perfectionist/sort-named-imports': 'off',
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              // Side effect imports.
              ['^\\u0000'],
              // Third-party libraries and frameworks
              ['^@?\\w'],
              // Internal workspace packages
              ['^enums', '^schemas', '^app-types', '^app-constants'],
              // Relative imports
              ['^\\.\\.(?!/?$)', '^\\.\\./?$', '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
              // Style imports.
              ['^.+\\.?(css|scss|sass)$'],
            ],
          },
        ],
      },
    },
    {
      plugins: {
        'no-relative-import-paths': noRelativeImportPaths,
      },
      rules: {
        'no-relative-import-paths/no-relative-import-paths': [
          'warn',
          {
            allowSameFolder: true,
            allowedDepth: 1,
            rootDir: './src',
            prefix: '',
          },
        ],
      },
    },
  );

export default getNodeConfig();
