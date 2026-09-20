/**
 * Auth Route Integration Tests
 *
 * Tests: register, login, refresh-token, logout
 * Uses: supertest + MongoMemoryServer (no real DB)
 */
import request from "supertest";
import { app } from "../app.js";
import { createTestUser, authHeader } from "./helpers.js";

describe("Auth Routes", () => {
  // ───────────────────────────── REGISTER ─────────────────────────────
  describe("POST /api/v1/users/register", () => {
    const REGISTER = "/api/v1/users/register";

    it("should register a new user and return 201 with tokens", async () => {
      const res = await request(app).post(REGISTER).send({
        fullname: "Sami Khan",
        email: "sami@example.com",
        username: "samikhan",
        password: "securePass123",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe("samikhan");
      expect(res.body.data.user.email).toBe("sami@example.com");
      expect(res.body.data.user.password).toBeUndefined(); // password excluded
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Tokens should also be set as cookies
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
      expect(cookieStr).toContain("accessToken");
      expect(cookieStr).toContain("refreshToken");
    });

    it("should return 409 for duplicate username", async () => {
      // First registration
      await request(app).post(REGISTER).send({
        fullname: "User One",
        email: "user1@example.com",
        username: "duplicateuser",
        password: "password123",
      });

      // Duplicate username
      const res = await request(app).post(REGISTER).send({
        fullname: "User Two",
        email: "user2@example.com",
        username: "duplicateuser",
        password: "password123",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate email", async () => {
      await request(app).post(REGISTER).send({
        fullname: "User One",
        email: "same@example.com",
        username: "user_one",
        password: "password123",
      });

      const res = await request(app).post(REGISTER).send({
        fullname: "User Two",
        email: "same@example.com",
        username: "user_two",
        password: "password123",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const res = await request(app).post(REGISTER).send({
        email: "incomplete@example.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request(app).post(REGISTER).send({
        fullname: "Bad Email",
        email: "not-an-email",
        username: "bademail",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for short password (< 8 chars)", async () => {
      const res = await request(app).post(REGISTER).send({
        fullname: "Short Pass",
        email: "shortpass@example.com",
        username: "shortpass",
        password: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for invalid username format", async () => {
      const res = await request(app).post(REGISTER).send({
        fullname: "Bad Username",
        email: "baduser@example.com",
        username: "BAD USER!",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────── LOGIN ─────────────────────────────
  describe("POST /api/v1/users/login", () => {
    const LOGIN = "/api/v1/users/login";

    beforeEach(async () => {
      // Seed a user for login tests
      await request(app).post("/api/v1/users/register").send({
        fullname: "Login User",
        email: "login@example.com",
        username: "loginuser",
        password: "password123",
      });
    });

    it("should login with email + password and return 200 with tokens", async () => {
      const res = await request(app).post(LOGIN).send({
        email: "login@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it("should login with username + password and return 200", async () => {
      const res = await request(app).post(LOGIN).send({
        username: "loginuser",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe("loginuser");
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app).post(LOGIN).send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 for non-existent user (no user enumeration)", async () => {
      const res = await request(app).post(LOGIN).send({
        email: "doesnotexist@example.com",
        password: "password123",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when both email and username are missing", async () => {
      const res = await request(app).post(LOGIN).send({
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────── REFRESH TOKEN ─────────────────────────────
  describe("POST /api/v1/users/refresh-token", () => {
    const REFRESH = "/api/v1/users/refresh-token";

    it("should refresh tokens with a valid refresh token", async () => {
      const { refreshToken } = await createTestUser(app, {
        email: "refresh@example.com",
        username: "refreshuser",
      });

      const res = await request(app).post(REFRESH).send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it("should return 401 when no refresh token is provided", async () => {
      const res = await request(app).post(REFRESH).send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 for an invalid refresh token", async () => {
      const res = await request(app).post(REFRESH).send({
        refreshToken: "invalid.token.string",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────── LOGOUT ─────────────────────────────
  describe("POST /api/v1/users/logout", () => {
    const LOGOUT = "/api/v1/users/logout";

    it("should logout and clear cookies with valid token", async () => {
      const { accessToken } = await createTestUser(app, {
        email: "logout@example.com",
        username: "logoutuser",
      });

      const res = await request(app)
        .post(LOGOUT)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("logged out");
    });

    it("should return 401 when no token is provided", async () => {
      const res = await request(app).post(LOGOUT);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
