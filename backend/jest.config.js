module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/__tests__/setupEnv.ts'],
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  forceExit: true,
  clearMocks: true
};
