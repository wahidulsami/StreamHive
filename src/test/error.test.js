/**
 * Error Handling Tests
 *
 * Tests: ApiError class, errorHandler middleware, proper status codes
 * Verifies the API returns consistent error format.
 */
import request from "supertest";
import { app } from "../app.js";
import { ApiError } from "../utils/apiError.js";

describe("Error Handling", () => {
  // ───────────────────────────── ApiError CLASS ─────────────────────────────
  describe("ApiError class", () => {
    it("should create an error with correct statusCode and message", () => {
      const err = new ApiError(404, "Not found");

      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Not found");
      expect(err.success).toBe(false);
      expect(err.data).toBeNull();
    });

    it("should include errors array when provided", () => {
      const errors = [{ field: "email", message: "invalid" }];
      const err = new ApiError(400, "Validation failed", errors);

      expect(err.errors).toEqual(errors);
      expect(err.errors.length).toBe(1);
    });

    it("should have a stack trace", () => {
      const err = new ApiError(500, "Server error");

      expect(err.stack).toBeDefined();
      expect(err.stack.length).toBeGreaterThan(0);
    });

    it("should default message to 'An error occurred'", () => {
      const err = new ApiError(500);

      expect(err.message).toBe("An error occurred");
    });
  });

  // ───────────────────────────── ERROR MIDDLEWARE VIA API ─────────────────────────────
  describe("Error middleware (integration)", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/v1/nonexistent-route");

      // Express 5 returns 404 for unmatched routes
      expect(res.status).toBe(404);
    });

    it("should return proper error format for thrown ApiError", async () => {
      // Trigger a known ApiError: login with no credentials
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({ password: "test123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });

    it("should return 400 for invalid video ID (ApiError format)", async () => {
      const res = await request(app).get("/api/v1/video/not-a-valid-id");

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
        })
      );
    });

    it("should return 401 for unauthorized access to protected route", async () => {
      const res = await request(app).post("/api/v1/users/logout");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should include errors array in validation error response", async () => {
      const res = await request(app)
        .post("/api/v1/users/register")
        .send({}); // empty body → Zod validation errors

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors.length).toBeGreaterThan(0);

      // Each error should have field + message
      res.body.errors.forEach((err) => {
        expect(err).toHaveProperty("field");
        expect(err).toHaveProperty("message");
      });
    });

    it("should return consistent error shape across different error types", async () => {
      // 400 — validation
      const res400 = await request(app)
        .post("/api/v1/users/register")
        .send({});
      // 401 — unauthorized
      const res401 = await request(app).post("/api/v1/users/logout");

      // Both should have { success: false, message: string }
      for (const res of [res400, res401]) {
        expect(res.body).toHaveProperty("success", false);
        expect(res.body).toHaveProperty("message");
        expect(typeof res.body.message).toBe("string");
      }
    });
  });

  // ───────────────────────────── HEALTH CHECK ─────────────────────────────
  describe("GET /health", () => {
    it("should return 200 with status ok", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.uptime).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
