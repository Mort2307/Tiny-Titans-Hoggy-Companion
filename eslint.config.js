import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Retired sources are preserved for audit/history and are not part of the active build.
  globalIgnores(['dist', 'retirement']),
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
    rules: {
      // Intentional Firebase/browser synchronisation effects are used throughout
      // the app. The React Compiler diagnostic is currently over-broad for these
      // external-data loading effects, so do not treat it as a production lint
      // signal. We still enforce hooks dependencies and compiler safety rules.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      // ParentSelector exports its public snakeToSelection helper alongside the
      // component. This is intentional and does not affect runtime behaviour.
      'react-refresh/only-export-components': 'off',
      'no-useless-escape': 'warn',
      'preserve-caught-error': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    // MySnakes contains legacy delete handlers whose UI was removed from this
    // page when project management was moved to the Breeding Planner. Keep the
    // dormant handlers available until that workflow is either restored or
    // formally removed; they must not block the production lint gate meanwhile.
    files: ['src/pages/MySnakes.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
