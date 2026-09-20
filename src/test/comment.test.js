/**
 * Comment Controller Integration Tests
 *
 * Tests: addComment, getVideoComments, updateComment, deleteComments
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

describe("Comment Routes", () => {
  let token, userId, otherToken, otherUserId;
  let video;

  beforeEach(async () => {
    const { user, accessToken } = await createTestUser(app, {
      email: "commenter@example.com",
      username: "commenter",
    });
    userId = user._id;
    token = accessToken;

    const other = await createTestUser(app, {
      fullname: "Other User",
      email: "othercommenter@example.com",
      username: "othercommenter",
    });
    otherUserId = other.user._id;
    otherToken = other.accessToken;

    video = await Video.create({
      title: "Comment Test Video",
      description: "Test",
      videoFile: "https://res.cloudinary.com/test/video.mp4",
      thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
      duration: 60,
      owner: userId,
      isPublished: true,
    });
  });

  // ──────────────── ADD COMMENT ────────────────
  describe("POST /api/v1/comment/:videoId", () => {
    it("should add a comment and return 201", async () => {
      const res = await request(app)
        .post(`/api/v1/comment/${video._id}`)
        .set(authHeader(token))
        .send({ content: "Great video!" });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("Great video!");
      expect(res.body.data.owner).toBeDefined();
    });

    it("should add a reply with parentCommentId", async () => {
      const parent = await Comment.create({
        content: "Parent comment",
        video: video._id.toString(),
        owner: userId,
      });

      const res = await request(app)
        .post(`/api/v1/comment/${video._id}`)
        .set(authHeader(token))
        .send({ content: "Reply!", parentCommentId: parent._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.data.parentComment.toString()).toBe(parent._id.toString());
    });

    it("should return 400 for empty content", async () => {
      const res = await request(app)
        .post(`/api/v1/comment/${video._id}`)
        .set(authHeader(token))
        .send({ content: "" });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid video ID", async () => {
      const res = await request(app)
        .post("/api/v1/comment/bad-id")
        .set(authHeader(token))
        .send({ content: "Test" });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid parentCommentId", async () => {
      const res = await request(app)
        .post(`/api/v1/comment/${video._id}`)
        .set(authHeader(token))
        .send({ content: "Reply", parentCommentId: "not-a-valid-id" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET VIDEO COMMENTS ────────────────
  describe("GET /api/v1/comment/:videoId", () => {
    it("should list comments for a video", async () => {
      await Comment.create({
        content: "Comment 1",
        video: video._id.toString(),
        owner: userId,
      });
      await Comment.create({
        content: "Comment 2",
        video: video._id.toString(),
        owner: otherUserId,
      });

      const res = await request(app)
        .get(`/api/v1/comment/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toBeInstanceOf(Array);
      expect(res.body.data.docs.length).toBe(2);
    });

    it("should return empty list when no comments", async () => {
      const res = await request(app)
        .get(`/api/v1/comment/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toBeInstanceOf(Array);
      expect(res.body.data.docs.length).toBe(0);
    });

    it("should return 400 for invalid video ID", async () => {
      const res = await request(app)
        .get("/api/v1/comment/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── UPDATE COMMENT ────────────────
  describe("PATCH /api/v1/comment/c/:commentId", () => {
    it("should update own comment", async () => {
      const comment = await Comment.create({
        content: "Original",
        video: video._id.toString(),
        owner: userId,
      });

      const res = await request(app)
        .patch(`/api/v1/comment/c/${comment._id}`)
        .set(authHeader(token))
        .send({ content: "Updated!" });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe("Updated!");
    });

    it("should return 403 when updating other's comment", async () => {
      const comment = await Comment.create({
        content: "Not mine",
        video: video._id.toString(),
        owner: otherUserId,
      });

      const res = await request(app)
        .patch(`/api/v1/comment/c/${comment._id}`)
        .set(authHeader(token))
        .send({ content: "Hacked!" });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent comment", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/comment/c/${fakeId}`)
        .set(authHeader(token))
        .send({ content: "Test" });

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid comment ID", async () => {
      const res = await request(app)
        .patch("/api/v1/comment/c/bad-id")
        .set(authHeader(token))
        .send({ content: "Test" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── DELETE COMMENT ────────────────
  describe("DELETE /api/v1/comment/c/:commentId", () => {
    it("should delete own comment", async () => {
      const comment = await Comment.create({
        content: "Delete me",
        video: video._id.toString(),
        owner: userId,
      });

      const res = await request(app)
        .delete(`/api/v1/comment/c/${comment._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
    });

    it("should return 403 when deleting other's comment", async () => {
      const comment = await Comment.create({
        content: "Not mine",
        video: video._id.toString(),
        owner: otherUserId,
      });

      const res = await request(app)
        .delete(`/api/v1/comment/c/${comment._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent comment", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/comment/c/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid comment ID", async () => {
      const res = await request(app)
        .delete("/api/v1/comment/c/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });
});
