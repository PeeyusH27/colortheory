// Integration tests that talk to a REAL Supabase project (never production).
// They are excluded from `npm test` and skipped automatically unless credentials are provided:
//
//   SUPABASE_TEST_URL=… SUPABASE_TEST_PUBLISHABLE_KEY=… \
//   SUPABASE_TEST_USER_A_EMAIL=… SUPABASE_TEST_USER_A_PASSWORD=… \
//   SUPABASE_TEST_USER_B_EMAIL=… SUPABASE_TEST_USER_B_PASSWORD=… \
//   npm run test:integration
const base = require('./package.json').jest;

module.exports = {
  ...base,
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/supabase/'],
  testMatch: ['**/*.integration.test.ts'],
  testTimeout: 30_000,
};
