/**
 * Validation Middleware Unit Tests
 *
 * Tests: validate() middleware with various Zod schemas
 * Verifies that bad input is rejected with proper 400 responses.
 */
import { validate } from "../middlewares/validation.middlewares.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

/**
 * Helper: create a mock Express (req, res, next) chain.
 * Returns { res, next, getResponse } for assertions.
 */
function mockReqRes(body = {}) {
  const req = { body };
  const res = {
    _status: null,
    _json: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._json = data;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, wasNextCalled: () => nextCalled };
}

describe("Validation Middleware", () => {
  // ───────────────────────────── REGISTER SCHEMA ─────────────────────────────
  describe("registerSchema", () => {
    const middleware = validate(registerSchema);

    it("should pass valid registration data", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        fullname: "Test User",
        email: "test@example.com",
        username: "testuser",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
      expect(res._status).toBeNull(); // no error response sent
    });

    it("should reject missing fullname", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        username: "testuser",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(res._json.errors).toBeDefined();
    });

    it("should reject invalid email format", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        fullname: "Test",
        email: "not-an-email",
        username: "testuser",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
      const emailError = res._json.errors.find((e) => e.field === "email");
      expect(emailError).toBeDefined();
    });

    it("should reject password shorter than 8 characters", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        fullname: "Test",
        email: "test@example.com",
        username: "testuser",
        password: "short",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });

    it("should reject username with invalid characters", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        fullname: "Test",
        email: "test@example.com",
        username: "BAD USER!",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });

    it("should reject username shorter than 3 characters", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        fullname: "Test",
        email: "test@example.com",
        username: "ab",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });

  // ───────────────────────────── LOGIN SCHEMA ─────────────────────────────
  describe("loginSchema", () => {
    const middleware = validate(loginSchema);

    it("should pass login with email + password", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should pass login with username + password", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        username: "testuser",
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should reject when both email and username are missing", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        password: "password123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });

    it("should reject when password is missing", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });

  // ───────────────────────────── CHANGE PASSWORD SCHEMA ─────────────────────────────
  describe("changePasswordSchema", () => {
    const middleware = validate(changePasswordSchema);

    it("should pass valid old + new password", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        oldPassword: "currentpass",
        newPassword: "newsecurepass123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should reject empty old password", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        oldPassword: "",
        newPassword: "newsecurepass123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });

    it("should reject new password shorter than 8 chars", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        oldPassword: "currentpass",
        newPassword: "short",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });

  // ───────────────────────────── RESET PASSWORD OTP SCHEMA ─────────────────────────────
  describe("resetPasswordOtpSchema", () => {
    const middleware = validate(resetPasswordOtpSchema);

    it("should pass valid email", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "valid@example.com",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should reject invalid email", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "bad-email",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });

  // ───────────────────────────── VERIFY OTP SCHEMA ─────────────────────────────
  describe("verifyOtpSchema", () => {
    const middleware = validate(verifyOtpSchema);

    it("should pass valid email + 6-digit OTP", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        otp: "123456",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should reject OTP that is not 6 digits", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        otp: "12345", // only 5 digits
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });

    it("should reject OTP with non-numeric characters", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        otp: "12ab56",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });

  // ───────────────────────────── RESET PASSWORD SCHEMA ─────────────────────────────
  describe("resetPasswordSchema", () => {
    const middleware = validate(resetPasswordSchema);

    it("should pass valid email + OTP + new password", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        otp: "654321",
        newPassword: "newsecure123",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should reject when new password is too short", () => {
      const { req, res, next, wasNextCalled } = mockReqRes({
        email: "test@example.com",
        otp: "654321",
        newPassword: "short",
      });

      middleware(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });
});
