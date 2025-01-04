// @ts-check
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dev/*',
      '**/dist/*',
      '**/tests/*',
      'tsconfig.json',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,

  {
    settings: {
      'import/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: [
            'packages/web/tsconfig.json',
            'packages/server/tsconfig.json',
          ],
        }),
      ],
    },
    languageOptions: {
      parserOptions: {
        root: true,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true, ignoreVoidOperator: true },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  {
    files: [
      '**/*.js,jsx,mjs,cjs',
      '**/drizzle.config.ts',
      '**/postcss.config.js',
      '**/migrate.ts',
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    files: ['packages/web/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    // ...reactHooks.configs.flat.recommended,
    // ...reactHooks.configs['recommended-latest'],
    plugins: {
      react,
      jsxA11y,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      ...react.configs.flat.recommended.languageOptions,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: { ...reactHooks.configs.recommended.rules },
  },

  {
    files: ['packages/server/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        globals: {
          ...globals.node,
        },
      },
    },
  },
);
