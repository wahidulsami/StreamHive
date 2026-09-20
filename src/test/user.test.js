/**
 * User Controller Integration Tests (additional handlers)
 *
 * Tests: getCurrentUser, updateAccoutDetails, changeCurrentPassword,
 *        updateUserAvatar, updateUserCoverImage, resetPasswordOTP,
 *        verifyOTP, resetPassword, getWatchhistory
 */
import { jest } from "@jest/globals";
import mongoose from "mongoose";

// Mock Cloudinary BEFORE importing app (ESM mock hoisting)
jest.unstable_mockModule("../utils/cloudnary.js", () => ({
  uploadCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/test/upload/v1/test.jpg",
    duration: 120.5,
  }),
}));

// Mock nodemailer transporter BEFORE importing app (ESM mock hoisting)
jest.unstable_mockModule("../config/nodemailer.js", () => ({
  default: {
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  },
}));

// Dynamic imports AFTER all mocks
const { app } = await import("../app.js");
const supertest = await import("supertest");
const request = supertest.default;

const { createTestUser, authHeader } = await import("./helpers.js");
const { Video } = await import("../models/Video.model.js");
const { User } = await import("../models/User.model.js");
const { uploadCloudinary } = await import("../utils/cloudnary.js");
const { default: transporterMock } = await import("../config/nodemailer.js");

describe("User Controller (additional handlers)", () => {
  let token, userId, rawPassword;

  beforeEach(async () => {
    jest.clearAllMocks();
    rawPassword = "securePass123";
    const { user, accessToken } = await createTestUser(app, {
      fullname: "Profile User",
      email: "profile@example.com",
      username: "profileuser",
      password: rawPassword,
    });
    userId = user._id;
    token = accessToken;
  });

  // ──────────────── GET CURRENT USER ────────────────
  describe("GET /api/v1/users/current-user", () => {
    it("should return the current user", async () => {
      const res = await request(app)
        .get("/api/v1/users/current-user")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe("profileuser");
      expect(res.body.data.password).toBeUndefined();
    });

    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/v1/users/current-user");

      expect(res.status).toBe(401);
    });
  });

  // ──────────────── UPDATE ACCOUNT DETAILS ────────────────
  describe("PATCH /api/v1/users/update-account-details", () => {
    it("should update fullname and email", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-account-details")
        .set(authHeader(token))
        .send({
          fullname: "Updated Name",
          email: "updated@example.com",
          bio: "New bio",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fullname).toBe("updated name");
      expect(res.body.data.email).toBe("updated@example.com");
      expect(res.body.data.bio).toBe("New bio");
    });

    it("should return 400 when fullname is missing", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-account-details")
        .set(authHeader(token))
        .send({ email: "test@example.com" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when email is missing", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-account-details")
        .set(authHeader(token))
        .send({ fullname: "Test" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── CHANGE PASSWORD ────────────────
  describe("POST /api/v1/users/change-password", () => {
    it("should change the password", async () => {
      const res = await request(app)
        .post("/api/v1/users/change-password")
        .set(authHeader(token))
        .send({ oldPassword: rawPassword, newPassword: "newSecure456" });

      expect(res.status).toBe(200);
    });

    it("should return 400 for wrong old password", async () => {
      const res = await request(app)
        .post("/api/v1/users/change-password")
        .set(authHeader(token))
        .send({ oldPassword: "wrongpassword", newPassword: "newSecure456" });

      expect(res.status).toBe(400);
    });

    it("should return 400 for short new password", async () => {
      const res = await request(app)
        .post("/api/v1/users/change-password")
        .set(authHeader(token))
        .send({ oldPassword: rawPassword, newPassword: "short" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── UPDATE AVATAR ────────────────
  describe("PATCH /api/v1/users/update-avatar", () => {
    it("should update avatar with mocked Cloudinary", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-avatar")
        .set(authHeader(token))
        .attach("avatar", Buffer.from("fake-avatar-data"), {
          filename: "avatar.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(uploadCloudinary).toHaveBeenCalled();
    });

    it("should return 400 when no file is provided", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-avatar")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── UPDATE COVER IMAGE ────────────────
  describe("PATCH /api/v1/users/update-cover", () => {
    it("should update cover image with mocked Cloudinary", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-cover")
        .set(authHeader(token))
        .attach("coverImage", Buffer.from("fake-cover-data"), {
          filename: "cover.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(uploadCloudinary).toHaveBeenCalled();
    });

    it("should return 400 when no file is provided", async () => {
      const res = await request(app)
        .patch("/api/v1/users/update-cover")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── RESET PASSWORD OTP ────────────────
  describe("POST /api/v1/users/reset-password-otp", () => {
    it("should send OTP to email", async () => {
      const res = await request(app)
        .post("/api/v1/users/reset-password-otp")
        .send({ email: "profile@example.com" });

      expect(res.status).toBe(200);
      expect(transporterMock.sendMail).toHaveBeenCalled();
    });

    it("should return 404 for non-existent email", async () => {
      const res = await request(app)
        .post("/api/v1/users/reset-password-otp")
        .send({ email: "nobody@example.com" });

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── VERIFY OTP ────────────────
  describe("POST /api/v1/users/verify-otp", () => {
    it("should verify a valid OTP", async () => {
      // Set OTP directly in DB
      const user = await User.findById(userId);
      user.resetOtp = "123456";
      user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .post("/api/v1/users/verify-otp")
        .send({ email: "profile@example.com", otp: "123456" });

      expect(res.status).toBe(200);
    });

    it("should return 400 for invalid OTP", async () => {
      const user = await User.findById(userId);
      user.resetOtp = "123456";
      user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .post("/api/v1/users/verify-otp")
        .send({ email: "profile@example.com", otp: "000000" });

      expect(res.status).toBe(400);
    });

    it("should return 400 for expired OTP", async () => {
      const user = await User.findById(userId);
      user.resetOtp = "123456";
      user.resetOtpExpireAt = Date.now() - 1000;
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .post("/api/v1/users/verify-otp")
        .send({ email: "profile@example.com", otp: "123456" });

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/v1/users/verify-otp")
        .send({ email: "nobody@example.com", otp: "123456" });

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── RESET PASSWORD ────────────────
  describe("POST /api/v1/users/reset-password", () => {
    it("should reset password after OTP verification", async () => {
      const user = await User.findById(userId);
      user.resetOtp = "654321";
      user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000;
      user.isOtpVerified = true;
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          email: "profile@example.com",
          otp: "654321",
          newPassword: "newResetPass123",
        });

      expect(res.status).toBe(200);
    });

    it("should return 400 when OTP not verified", async () => {
      const user = await User.findById(userId);
      user.resetOtp = "654321";
      user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000;
      user.isOtpVerified = false;
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          email: "profile@example.com",
          otp: "654321",
          newPassword: "newResetPass123",
        });

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          email: "nobody@example.com",
          otp: "123456",
          newPassword: "newPass123",
        });

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── WATCH HISTORY ────────────────
  describe("GET /api/v1/users/watch-history", () => {
    it("should return empty watch history", async () => {
      const res = await request(app)
        .get("/api/v1/users/watch-history")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("should return watch history with videos", async () => {
      const video = await Video.create({
        title: "Watched Video",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
        duration: 60,
        owner: userId,
        isPublished: true,
      });

      const user = await User.findById(userId);
      user.watchHistory.push(video._id);
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .get("/api/v1/users/watch-history")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("Watched Video");
    });
  });
});
