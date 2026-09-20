/**
 * Shared test mocks — Cloudinary and Nodemailer.
 *
 * IMPORTANT for ESM: jest.unstable_mockModule() MUST be called at file
 * top-level before any dynamic import of the module being mocked.
 * Each test file that needs Cloudinary calls setupCloudinaryMock()
 * at its top level, BEFORE `await import("../app.js")`.
 */
import { jest } from "@jest/globals";

/**
 * Set up a mock for src/utils/cloudnary.js via jest.unstable_mockModule.
 * @param {Object} overrides - Override default mock return values
 * @returns {{ uploadMock: jest.fn }}
 */
export function setupCloudinaryMock(overrides = {}) {
  const uploadMock = jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/test/upload/v1/test.jpg",
    duration: 120.5,
    ...overrides,
  });

  jest.unstable_mockModule("../utils/cloudnary.js", () => ({
    uploadCloudinary: uploadMock,
  }));

  return { uploadMock };
}
