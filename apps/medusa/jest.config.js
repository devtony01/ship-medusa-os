import { loadEnv } from '@medusajs/framework/utils';

loadEnv('test', process.cwd());

const TEST_MATCH_MAP = {
  'integration:http': ['**/integration-tests/http/*.spec.[jt]s'],
  'integration:modules': ['**/src/modules/*/__tests__/**/*.[jt]s'],
  unit: ['**/src/**/__tests__/**/*.unit.spec.[jt]s', '**/src/**/__tests__/**/*.spec.[jt]s'],
};

const testType = process.env.TEST_TYPE || 'unit';
const testMatch = TEST_MATCH_MAP[testType] || ['**/src/**/__tests__/**/*.spec.[jt]s'];

export default {
  transform: {
    '^.+\\.[jt]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
        },
      },
    ],
  },
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  modulePathIgnorePatterns: ['dist/', '<rootDir>/.medusa/'],
  setupFiles: ['./integration-tests/setup.js'],
  testMatch,
};
