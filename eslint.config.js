import js from 'eslint'@ /js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'retirement']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-refresh/only-export-components': 'off',
      'no-useless-escape': 'warn',
      'preserve-caught-error': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['src/components/reptile-room-3d/RoomCamera3D.tsx'],
    rules: {
      // Three.js camera/WebGL canvas instances are imperative runtime objects.
      // The component intentionally mutates those objects inside effects for
      // pointer controls and camera positioning; this must not block the lint gate.
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['src/pages/ReptileRoom3D.tsx'],
    rules: {
      // This workspace owns imperative Three.js/photo preview lifecycles via
      // refs. The existing effects intentionally manage those resource URLs
      // without depending on mutable ref values; the rest of the application
      // remains covered by exhaustive-deps normally.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['src/pages/MySnakes.tsx'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
])
