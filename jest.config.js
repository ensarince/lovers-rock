module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^pocketbase(/cjs)?$': '<rootDir>/__mocks__/pocketbase.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Extends the jest-expo default with @noble/*, which ships pure ESM and no CJS
  // build. Metro transpiles it fine at runtime; only Jest needs telling.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  globals: {
    __DEV__: true,
  },
};
