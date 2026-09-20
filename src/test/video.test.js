/**
 * Video CRUD Integration Tests
 *
 * Tests: getAllVideos, getVideoById, publishAVideo, updateVideo, deleteVideo, togglePublish
 * Cloudinary is mocked via jest.unstable_mockModule (ESM)
 */
import { jest } from "@jest/globals";
import mongoose from "mongoose";

// Mock Cloudinary BEFORE importing app (ESM mock hoisting)
jest.unstable_mockModule("../utils/cloudnary.js", () => ({
  uploadCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/test/image/upload/v1/test.jpg",
    duration: 120.5,
  }),
}));

// Dynamic imports AFTER mock setup
const { app } = await import("../app.js");
const supertest = await import("supertest");
const request = supertest.default;

const { createTestUser, authHeader } = await import("./helpers.js");
const { Video } = await import("../models/Video.model.js");

/**
 * Helper: seed a video directly in DB (bypasses cloudinary).
 */
async function seedVideo(ownerId, overrides = {}) {
  return Video.create({
    title: "Seeded Video",
    description: "A test video",
    videoFile: "https://res.cloudinary.com/test/video/upload/v1/seeded.mp4",
    thumbnail: "https://res.cloudinary.com/test/image/upload/v1/thumb.jpg",
    duration: 60,
    owner: ownerId,
    isPublished: true,
    ...overrides,
  });
}

describe("Video CRUD Routes", () => {
  let testAccessToken;
  let testUserId;

  beforeEach(async () => {
    const { user, accessToken } = await createTestUser(app, {
      email: "videouser@example.com",
      username: "videouser",
    });
    testAccessToken = accessToken;
    testUserId = user._id;
  });

  // ───────────────────────────── GET ALL VIDEOS ─────────────────────────────
  describe("GET /api/v1/video/getAllVideos", () => {
    it("should return paginated video list with 200", async () => {
      // Seed some videos
      await seedVideo(testUserId, { title: "Video 1" });
      await seedVideo(testUserId, { title: "Video 2" });

      const res = await request(app).get("/api/v1/video/getAllVideos");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.docs).toBeInstanceOf(Array);
      expect(res.body.data.docs.length).toBe(2);
    });

    it("should return empty list when no videos exist", async () => {
      const res = await request(app).get("/api/v1/video/getAllVideos");

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toBeInstanceOf(Array);
      expect(res.body.data.docs.length).toBe(0);
    });
  });

  // ───────────────────────────── GET VIDEO BY ID ─────────────────────────────
  describe("GET /api/v1/video/:videoId", () => {
    it("should return video data and increment view count", async () => {
      const video = await seedVideo(testUserId);

      const res = await request(app).get(`/api/v1/video/${video._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Seeded Video");
      // View count should be incremented (was 0, now 1)
      expect(res.body.data.views).toBe(1);
    });

    it("should return 400 for invalid video ID format", async () => {
      const res = await request(app).get("/api/v1/video/invalid-id");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent video ID", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/video/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────── PUBLISH VIDEO ─────────────────────────────
  describe("POST /api/v1/video/upload-video", () => {
    it("should return 401 for unauthenticated upload", async () => {
      const res = await request(app)
        .post("/api/v1/video/upload-video")
        .field("title", "Test Video")
        .field("description", "Test Description");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when title is missing", async () => {
      const res = await request(app)
        .post("/api/v1/video/upload-video")
        .set(authHeader(testAccessToken))
        .field("description", "Missing title")
        .attach("video", Buffer.from("fake-video"), {
          filename: "test.mp4",
          contentType: "video/mp4",
        })
        .attach("thumbnail", Buffer.from("fake-thumb"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should publish a video with mocked Cloudinary and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/video/upload-video")
        .set(authHeader(testAccessToken))
        .field("title", "My Test Video")
        .field("description", "A great video")
        .attach("video", Buffer.from("fake-video-data"), {
          filename: "test.mp4",
          contentType: "video/mp4",
        })
        .attach("thumbnail", Buffer.from("fake-thumb-data"), {
          filename: "thumb.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("My Test Video");
      expect(res.body.data.videoFile).toContain("cloudinary.com");
    });
  });

  // ───────────────────────────── UPDATE VIDEO ─────────────────────────────
  describe("PATCH /api/v1/video/update-video/:videoId", () => {
    it("should update video title and description", async () => {
      const video = await seedVideo(testUserId);

      const res = await request(app)
        .patch(`/api/v1/video/update-video/${video._id}`)
        .set(authHeader(testAccessToken))
        .send({ title: "Updated Title", description: "Updated Desc" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated Title");
      expect(res.body.data.description).toBe("Updated Desc");
    });

    it("should return 400 for invalid video ID", async () => {
      const res = await request(app)
        .patch("/api/v1/video/update-video/bad-id")
        .set(authHeader(testAccessToken))
        .send({ title: "New" });

      expect(res.status).toBe(400);
    });
  });

  // ───────────────────────────── DELETE VIDEO ─────────────────────────────
  describe("DELETE /api/v1/video/deleteVideo/:videoId", () => {
    it("should delete own video and return 200", async () => {
      const video = await seedVideo(testUserId);

      const res = await request(app)
        .delete(`/api/v1/video/deleteVideo/${video._id}`)
        .set(authHeader(testAccessToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted from DB
      const deleted = await Video.findById(video._id);
      expect(deleted).toBeNull();
    });

    it("should return 403 when non-owner tries to delete", async () => {
      const video = await seedVideo(testUserId);

      // Create a different user
      const { accessToken: otherToken } = await createTestUser(app, {
        email: "other@example.com",
        username: "otheruser",
      });

      const res = await request(app)
        .delete(`/api/v1/video/deleteVideo/${video._id}`)
        .set(authHeader(otherToken));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent video", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/video/deleteVideo/${fakeId}`)
        .set(authHeader(testAccessToken));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────── TOGGLE PUBLISH ─────────────────────────────
  describe("PATCH /api/v1/video/:videoId/toggle-publish", () => {
    it("should toggle isPublished from true to false", async () => {
      const video = await seedVideo(testUserId, { isPublished: true });

      const res = await request(app)
        .patch(`/api/v1/video/${video._id}/toggle-publish`)
        .set(authHeader(testAccessToken));

      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(false);
    });

    it("should toggle isPublished from false to true", async () => {
      const video = await seedVideo(testUserId, { isPublished: false });

      const res = await request(app)
        .patch(`/api/v1/video/${video._id}/toggle-publish`)
        .set(authHeader(testAccessToken));

      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(true);
    });

    it("should return 400 for invalid video ID", async () => {
      const res = await request(app)
        .patch("/api/v1/video/not-valid-id/toggle-publish")
        .set(authHeader(testAccessToken));

      expect(res.status).toBe(400);
    });
  });
});
