/**
 * Test helper utilities — shared across all test suites.
 *
 * IMPORTANT: `app` must be passed in, NOT statically imported here.
 * This avoids ESM module-registry issues when test files mock
 * modules (like cloudnary.js) before importing app.
 */
import request from "supertest";

/**
 * Register a test user and return the user object + tokens.
 * @param {Object} app - Express app instance
 * @param {Object} overrides - Override default user fields
 * @returns {{ user: Object, accessToken: string, refreshToken: string }}
 */
export async function createTestUser(app, overrides = {}) {
  const defaultUser = {
    fullname: "Test User",
    email: "testuser@example.com",
    username: "testuser",
    password: "password123",
    ...overrides,
  };

  const res = await request(app)
    .post("/api/v1/users/register")
    .send(defaultUser)
    .expect(201);

  return {
    user: res.body.data.user,
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

/**
 * Returns Authorization header object for authenticated requests.
 * @param {string} token - JWT access token
 */
export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}
