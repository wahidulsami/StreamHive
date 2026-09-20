/**
 * Jest setupFilesAfterFramework — runs AFTER test framework is available.
 * Manages mongoose connection lifecycle per test suite.
 */
import mongoose from "mongoose";

beforeAll(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI not set — did globalSetup run?");
  }
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
