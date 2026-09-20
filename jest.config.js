/** @type {import('jest').Config} */
export default {
  // Test file discovery
  testMatch: ["<rootDir>/src/test/**/*.test.js"],

  // Lifecycle hooks
  globalSetup: "<rootDir>/src/test/globalSetup.js",
  globalTeardown: "<rootDir>/src/test/globalTeardown.js",
  setupFiles: ["<rootDir>/src/test/env-setup.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test/db-handler.js"],

  // Timeouts
  testTimeout: 30000,

  // Coverage
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "clover"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/test/**",
    "!src/index.js",
    "!src/log/**",
    "!src/config/emailTemplates.js",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "src/db/index.js",
    "src/constants.js",
  ],

  // Force exit after tests complete (handles open handles from mongoose)
  forceExit: true,
  detectOpenHandles: true,
};
