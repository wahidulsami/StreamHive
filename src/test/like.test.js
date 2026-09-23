/**
 * Like Controller Integration Tests
 *
 * Tests: toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos, getUserLikedComments
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

const { app } = await import("../app.js");
const supertest = await import("supertest");
const request = supertest.default;

const { createTestUser, authHeader } = await import("./helpers.js");
const { Video } = await import("../models/Video.model.js");
const { Comment } = await import("../models/Comment.model.js");
const { Tweet } = await import("../models/Tweet.model.js");

describe("Like Routes", () => {
  let token, userId;
  let video, comment, tweet;

  beforeEach(async () => {
    const { user, accessToken } = await createTestUser(app, {
      email: "likeuser@example.com",
      username: "likeuser",
    });
    userId = user._id;
    token = accessToken;

    await createTestUser(app, {
      fullname: "Other User",
      email: "otherliker@example.com",
      username: "otherliker",
    });

    video = await Video.create({
      title: "Like Test Video",
      description: "Test",
      videoFile: "https://res.cloudinary.com/test/video.mp4",
      thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
      duration: 60,
      owner: userId,
      isPublished: true,
    });

    comment = await Comment.create({
      content: "Nice video!",
      video: video._id.toString(),
      owner: userId,
    });

    tweet = await Tweet.create({
      content: "Hello world",
      owner: userId,
    });
  });

  // ──────────────── TOGGLE VIDEO LIKE ────────────────
  describe("POST /api/v1/likes/toggle/v/:videoId", () => {
    it("should like a video and return 200", async () => {
      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(true);
      expect(res.body.data.likesCount).toBe(1);
    });

    it("should unlike a video on second toggle", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set(authHeader(token));

      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(false);
      expect(res.body.data.likesCount).toBe(0);
    });

    it("should return 400 for invalid video ID", async () => {
      const res = await request(app)
        .post("/api/v1/likes/toggle/v/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent video", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`);

      expect(res.status).toBe(401);
    });
  });

  // ──────────────── TOGGLE COMMENT LIKE ────────────────
  describe("POST /api/v1/likes/toggle/c/:commentId", () => {
    it("should like a comment and return 200", async () => {
      const res = await request(app)
        .post(`/api/v1/likes/toggle/c/${comment._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(true);
    });

    it("should unlike a comment on second toggle", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/c/${comment._id}`)
        .set(authHeader(token));

      const res = await request(app)
        .post(`/api/v1/likes/toggle/c/${comment._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(false);
    });

    it("should return 400 for invalid comment ID", async () => {
      const res = await request(app)
        .post("/api/v1/likes/toggle/c/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent comment", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/likes/toggle/c/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── TOGGLE TWEET LIKE ────────────────
  describe("POST /api/v1/likes/toggle/t/:tweetId", () => {
    it("should like a tweet and return 200", async () => {
      const res = await request(app)
        .post(`/api/v1/likes/toggle/t/${tweet._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(true);
    });

    it("should unlike a tweet on second toggle", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/t/${tweet._id}`)
        .set(authHeader(token));

      const res = await request(app)
        .post(`/api/v1/likes/toggle/t/${tweet._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(false);
    });

    it("should return 400 for invalid tweet ID", async () => {
      const res = await request(app)
        .post("/api/v1/likes/toggle/t/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent tweet", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/likes/toggle/t/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── GET LIKED VIDEOS ────────────────
  describe("GET /api/v1/likes/videos", () => {
    it("should return liked videos", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set(authHeader(token));

      const res = await request(app)
        .get("/api/v1/likes/videos")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it("should return empty array when no likes", async () => {
      const res = await request(app)
        .get("/api/v1/likes/videos")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ──────────────── GET LIKED COMMENTS ────────────────
  describe("GET /api/v1/likes/liked-comments", () => {
    it("should return liked comments", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/c/${comment._id}`)
        .set(authHeader(token));

      const res = await request(app)
        .get("/api/v1/likes/liked-comments")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it("should return empty array when no liked comments", async () => {
      const res = await request(app)
        .get("/api/v1/likes/liked-comments")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });
  });
});
