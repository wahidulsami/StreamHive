/**
 * Dashboard Controller Integration Tests
 *
 * Tests: getChannelStats, getChannelVideos, getChannelAnalytics,
 *        getRecentActivity, getTopVideo, getChannelComments
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
const { Like } = await import("../models/Like.model.js");
const { Subscription } = await import("../models/Subcripation.model.js");

describe("Dashboard Routes", () => {
  let token, userId;

  beforeEach(async () => {
    const { user, accessToken } = await createTestUser(app, {
      email: "dashboarduser@example.com",
      username: "dashboarduser",
    });
    userId = user._id;
    token = accessToken;
  });

  // ──────────────── GET CHANNEL STATS ────────────────
  describe("GET /api/v1/dashboard/stats", () => {
    it("should return channel stats with data", async () => {
      const video = await Video.create({
        title: "Stats Video",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
        duration: 60,
        owner: userId,
        isPublished: true,
        views: 100,
      });

      const other = await createTestUser(app, {
        fullname: "Sub",
        email: "sub@example.com",
        username: "subuser",
      });
      await Subscription.create({
        subscriber: other.user._id,
        channel: userId,
      });
      await Like.create({
        video: video._id,
        likedBy: other.user._id,
      });

      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.totalVideos).toBe(1);
      expect(res.body.data.totalViews).toBe(100);
      expect(res.body.data.totalLikes).toBe(1);
      expect(res.body.data.totalSubscribers).toBe(1);
    });
  });

  // ──────────────── GET CHANNEL VIDEOS ────────────────
  describe("GET /api/v1/dashboard/videos", () => {
    it("should return latest, top, and draft videos", async () => {
      await Video.create({
        title: "Published",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
        duration: 60,
        owner: userId,
        isPublished: true,
        views: 10,
      });
      await Video.create({
        title: "Draft",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video2.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb2.jpg",
        duration: 30,
        owner: userId,
        isPublished: false,
      });

      const res = await request(app)
        .get("/api/v1/dashboard/videos")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.latestVideos).toBeInstanceOf(Array);
      expect(res.body.data.latestVideos.length).toBe(2);
      expect(res.body.data.topVideos).toBeInstanceOf(Array);
      expect(res.body.data.draftVideos).toBeInstanceOf(Array);
      expect(res.body.data.draftVideos.length).toBe(1);
    });

    it("should return empty arrays when no videos", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/videos")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.latestVideos).toEqual([]);
    });
  });

  // ──────────────── GET CHANNEL ANALYTICS ────────────────
  describe("GET /api/v1/dashboard/analytics", () => {
    it("should return monthly analytics data", async () => {
      await Video.create({
        title: "Analytics Video",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
        duration: 60,
        owner: userId,
        isPublished: true,
        views: 50,
      });

      const res = await request(app)
        .get("/api/v1/dashboard/analytics")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.monthlyViews).toBeDefined();
      expect(res.body.data.monthlyViews.labels).toHaveLength(12);
      expect(res.body.data.monthlyViews.values).toHaveLength(12);
      expect(res.body.data.monthlyLikes).toBeDefined();
      expect(res.body.data.monthlySubscribers).toBeDefined();
    });
  });

  // ──────────────── GET RECENT ACTIVITY ────────────────
  describe("GET /api/v1/dashboard/recent-activity", () => {
    it("should return recent activity", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/recent-activity")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.comments).toBeInstanceOf(Array);
      expect(res.body.data.likes).toBeInstanceOf(Array);
      expect(res.body.data.subscribers).toBeInstanceOf(Array);
    });
  });

  // ──────────────── GET TOP VIDEO ────────────────
  describe("GET /api/v1/dashboard/top-video", () => {
    it("should return the top video", async () => {
      await Video.create({
        title: "Top Video",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
        duration: 60,
        owner: userId,
        isPublished: true,
        views: 999,
      });

      const res = await request(app)
        .get("/api/v1/dashboard/top-video")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Top Video");
    });

    it("should return 404 when no videos exist", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/top-video")
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── GET CHANNEL COMMENTS ────────────────
  describe("GET /api/v1/dashboard/comments", () => {
    it("should return channel comments", async () => {
      const video = await Video.create({
        title: "Comment Video",
        description: "Test",
        videoFile: "https://res.cloudinary.com/test/video.mp4",
        thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
        duration: 60,
        owner: userId,
        isPublished: true,
      });

      await Comment.create({
        content: "Nice!",
        video: video._id.toString(),
        owner: userId,
      });

      const res = await request(app)
        .get("/api/v1/dashboard/comments")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it("should return empty array when no videos", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/comments")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
