module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
  },
  overrides: [
    { files: ['**/*.test.js'], env: { node: true } },
    // A context module intentionally exports its provider and consumer hook together.
    {
      files: ['src/context/AuthContext.jsx'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
};
