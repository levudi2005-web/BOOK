import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-test/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/blob-report/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      ...reactHooks.configs.recommended.rules,
    },
  },
);
