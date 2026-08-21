/**
 * The live evaluation suite. Separate from jest.config.js because it calls the
 * real model: it needs a key, it costs money, and it is never part of CI.
 *
 * Run it with `pnpm eval`. `pnpm test` cannot pick these files up — the
 * default testMatch only collects `__tests__/**` and `*.test.*`.
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/eval/**/*.eval.ts'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/public/$1',
  },
  // One file, one pool, one report. Workers would each open their own.
  maxWorkers: 1,
  testTimeout: 120_000,
});
