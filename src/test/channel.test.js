/**
 * Channel Controller Integration Tests
 *
 * Tests: getChannelByusername (public route, no auth required)
 */
import { jest } from "@jest/globals";

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

const { createTestUser } = await import("./helpers.js");
const { Video } = await import("../models/Video.model.js");

describe("Channel Routes", () => {
  let user;

  beforeEach(async () => {
    user = await createTestUser(app, {
      fullname: "Channel Test User",
      email: "channeltest@example.com",
      username: "channeltestuser",
    });

    await Video.create({
      title: "Channel Test Video",
      description: "Test",
      videoFile: "https://res.cloudinary.com/test/video.mp4",
      thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
      duration: 60,
      owner: user.user._id,
      isPublished: true,
    });
  });

  describe("GET /api/v1/channel/:username", () => {
    it("should return channel info with videos", async () => {
      const res = await request(app).get(
        `/api/v1/channel/${user.user.username}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe("channeltestuser");
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.videos).toBeInstanceOf(Array);
      expect(res.body.data.videos.length).toBe(1);
    });

    it("should return 404 for non-existent username", async () => {
      const res = await request(app).get("/api/v1/channel/nonexistentuser");

      expect(res.status).toBe(404);
    });
  });
});
