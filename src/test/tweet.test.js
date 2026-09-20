/**
 * Tweet Controller Integration Tests
 *
 * Tests: createTweet, getUserTweets, updateTweet, deleteTweet
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
const { Tweet } = await import("../models/Tweet.model.js");

describe("Tweet Routes", () => {
  let token, userId;

  beforeEach(async () => {
    const { user, accessToken } = await createTestUser(app, {
      email: "tweetuser@example.com",
      username: "tweetuser",
    });
    userId = user._id;
    token = accessToken;
  });

  // ──────────────── CREATE TWEET ────────────────
  describe("POST /api/v1/tweet/createTweet", () => {
    it("should create a tweet and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/tweet/createTweet")
        .set(authHeader(token))
        .send({ content: "Hello world!" });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("Hello world!");
      expect(res.body.data.owner.toString()).toBe(userId.toString());
    });

    it("should return 400 for empty content", async () => {
      const res = await request(app)
        .post("/api/v1/tweet/createTweet")
        .set(authHeader(token))
        .send({ content: "" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET USER TWEETS ────────────────
  describe("GET /api/v1/tweet/user/:userId", () => {
    it("should return user tweets", async () => {
      await Tweet.create({ content: "Tweet 1", owner: userId });
      await Tweet.create({ content: "Tweet 2", owner: userId });

      const res = await request(app)
        .get(`/api/v1/tweet/user/${userId}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
    });

    it("should return 404 when user has no tweets", async () => {
      const res = await request(app)
        .get(`/api/v1/tweet/user/${userId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ──────────────── UPDATE TWEET ────────────────
  describe("PATCH /api/v1/tweet/:tweetId", () => {
    it("should update a tweet", async () => {
      const tweet = await Tweet.create({ content: "Original", owner: userId });

      const res = await request(app)
        .patch(`/api/v1/tweet/${tweet._id}`)
        .set(authHeader(token))
        .send({ content: "Updated!" });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe("Updated!");
    });

    it("should return 400 for empty content", async () => {
      const tweet = await Tweet.create({ content: "Test", owner: userId });

      const res = await request(app)
        .patch(`/api/v1/tweet/${tweet._id}`)
        .set(authHeader(token))
        .send({ content: "" });

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent tweet", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/tweet/${fakeId}`)
        .set(authHeader(token))
        .send({ content: "Test" });

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid tweet ID", async () => {
      const res = await request(app)
        .patch("/api/v1/tweet/bad-id")
        .set(authHeader(token))
        .send({ content: "Test" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── DELETE TWEET ────────────────
  describe("DELETE /api/v1/tweet/:tweetId", () => {
    it("should delete a tweet", async () => {
      const tweet = await Tweet.create({ content: "Delete me", owner: userId });

      const res = await request(app)
        .delete(`/api/v1/tweet/${tweet._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent tweet", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/tweet/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid tweet ID", async () => {
      const res = await request(app)
        .delete("/api/v1/tweet/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });
});
