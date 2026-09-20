/**
 * Subscription Controller Integration Tests
 *
 * Tests: toggleSubscription, getUserChannelsubscribersCount,
 *        getSubscribedChannelsData, getChannelSubscribers, checkSubscriptionStatus
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

describe("Subscription Routes", () => {
  let subscriberToken, subscriberId;
  let channelToken, channelId;

  beforeEach(async () => {
    const sub = await createTestUser(app, {
      fullname: "Subscriber",
      email: "subscriber@example.com",
      username: "subscriber",
    });
    subscriberToken = sub.accessToken;
    subscriberId = sub.user._id;

    const ch = await createTestUser(app, {
      fullname: "Channel Owner",
      email: "channelowner@example.com",
      username: "channelowner",
    });
    channelToken = ch.accessToken;
    channelId = ch.user._id;
  });

  // ──────────────── TOGGLE SUBSCRIPTION ────────────────
  describe("POST /api/v1/subscriptions/c/:channelId", () => {
    it("should subscribe to a channel", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(true);
      expect(res.body.data.subscribersCount).toBe(1);
    });

    it("should unsubscribe on second toggle", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      const res = await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);
      expect(res.body.data.subscribersCount).toBe(0);
    });

    it("should return 400 for self-subscription", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/c/${subscriberId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid channel ID", async () => {
      const res = await request(app)
        .post("/api/v1/subscriptions/c/bad-id")
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET SUBSCRIBED CHANNELS ────────────────
  describe("GET /api/v1/subscriptions/u/:subscriberId", () => {
    it("should return subscribed channels", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      const res = await request(app)
        .get(`/api/v1/subscriptions/u/${subscriberId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it("should return empty array when no subscriptions", async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/u/${subscriberId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it("should return 400 for invalid subscriber ID", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions/u/bad-id")
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET CHANNEL SUBSCRIBERS ────────────────
  describe("GET /api/v1/subscriptions/channel/:channelId/subscribers", () => {
    it("should return channel subscribers", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      const res = await request(app)
        .get(`/api/v1/subscriptions/channel/${channelId}/subscribers`)
        .set(authHeader(channelToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it("should return 400 for invalid channel ID", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions/channel/bad-id/subscribers")
        .set(authHeader(channelToken));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET SUBSCRIBERS COUNT ────────────────
  describe("GET /api/v1/subscriptions/subscribers/:channelId", () => {
    it("should return subscribers count", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      const res = await request(app)
        .get(`/api/v1/subscriptions/subscribers/${channelId}`)
        .set(authHeader(channelToken));

      expect(res.status).toBe(200);
      expect(res.body.data.subscribersCount).toBe(1);
    });

    it("should return 404 for non-existent channel", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/subscriptions/subscribers/${fakeId}`)
        .set(authHeader(channelToken));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid channel ID", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions/subscribers/bad-id")
        .set(authHeader(channelToken));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── CHECK SUBSCRIPTION STATUS ────────────────
  describe("GET /api/v1/subscriptions/status/:channelId", () => {
    it("should return subscribed: true when subscribed", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${channelId}`)
        .set(authHeader(subscriberToken));

      const res = await request(app)
        .get(`/api/v1/subscriptions/status/${channelId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(true);
    });

    it("should return subscribed: false when not subscribed", async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/status/${channelId}`)
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);
    });

    it("should return 400 for invalid channel ID", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions/status/bad-id")
        .set(authHeader(subscriberToken));

      expect(res.status).toBe(400);
    });
  });
});
