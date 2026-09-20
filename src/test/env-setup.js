/**
 * Jest setupFiles — runs BEFORE any test module is imported.
 * Sets all required process.env variables so env.js validation passes.
 */
import fs from "fs";
import path from "path";

// Read MongoDB URI written by globalSetup
const uriFile = path.join(process.cwd(), ".test-mongo-uri");
if (fs.existsSync(uriFile)) {
  process.env.MONGODB_URI = fs.readFileSync(uriFile, "utf8").trim();
}

// Core env vars (must be set before env.js is imported by any module)
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.LOG_LEVEL = "error";

// Auth secrets
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "test-access-token-secret-for-jest";
process.env.ACCESS_TOKEN_EXPIRY =
  process.env.ACCESS_TOKEN_EXPIRY || "1d";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test-refresh-token-secret-for-jest";
process.env.REFRESH_TOKEN_EXPIRY =
  process.env.REFRESH_TOKEN_EXPIRY || "10d";

// Cloudinary — dummy (mocked in tests)
process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || "test-cloud";
process.env.CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY || "test-api-key";
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "test-api-secret";

// SMTP — dummy
process.env.SMTP_HOST = process.env.SMTP_HOST || "localhost";
process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
process.env.SMTP_USER = process.env.SMTP_USER || "test@test.com";
process.env.SMTP_PASS = process.env.SMTP_PASS || "testpass";

// Email
process.env.SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@test.com";
