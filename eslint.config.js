import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'coverage',
    'storybook-static',
    'test-results',
    'playwright-report',
    'blob-report',
    'graphify-out',
    'supabase/.temp/**',
    'supabase/.branches/**',
    // Penpot execute_code snippets intentionally use top-level return.
    'scripts/design/**/*.mcp.js',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['workers/**/*.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
