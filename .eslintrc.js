module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    'dist/',
    'coverage/',
    'node_modules/',
    'server/dist/',
    'android/',
    'ios/',
    'supabase/functions/',
    'supabase/edge-functions/',
  ],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
