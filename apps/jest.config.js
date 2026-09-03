/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^foodie-shared-web$': '<rootDir>/shared/index.ts',
    '^foodie-shared-web/auth$': '<rootDir>/shared/auth/index.ts',
    '^foodie-shared-web/(.*)$': '<rootDir>/shared/$1',
  },
  clearMocks: true,
};
