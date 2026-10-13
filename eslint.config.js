// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions run on Deno with URL imports; they are linted/typechecked by the Supabase CLI instead.
    ignores: ['dist/*', 'supabase/functions/**', '.expo/*'],
  },
]);
