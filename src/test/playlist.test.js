/**
 * Playlist Controller Integration Tests
 *
 * Tests: createPlaylist, getUserPlaylists, getPlaylistById, addVideoToPlaylist,
 *        removeVideoFromPlaylist, deletePlaylist, updatePlaylist
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
const { Playlist } = await import("../models/Playlist.model.js");

describe("Playlist Routes", () => {
  let token, userId;
  let video;

  beforeEach(async () => {
    const { user, accessToken } = await createTestUser(app, {
      email: "playlistuser@example.com",
      username: "playlistuser",
    });
    userId = user._id;
    token = accessToken;

    video = await Video.create({
      title: "Playlist Test Video",
      description: "Test",
      videoFile: "https://res.cloudinary.com/test/video.mp4",
      thumbnail: "https://res.cloudinary.com/test/thumb.jpg",
      duration: 60,
      owner: userId,
      isPublished: true,
    });
  });

  // ──────────────── CREATE PLAYLIST ────────────────
  describe("POST /api/v1/playlist/createPlaylist", () => {
    it("should create a playlist and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/playlist/createPlaylist")
        .set(authHeader(token))
        .send({ name: "My Playlist", description: "A test playlist" });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("My Playlist");
      expect(res.body.data.description).toBe("A test playlist");
    });

    it("should return 409 for duplicate playlist name", async () => {
      await request(app)
        .post("/api/v1/playlist/createPlaylist")
        .set(authHeader(token))
        .send({ name: "Favorites", description: "First" });

      const res = await request(app)
        .post("/api/v1/playlist/createPlaylist")
        .set(authHeader(token))
        .send({ name: "Favorites", description: "Second" });

      expect(res.status).toBe(409);
    });

    it("should return 400 for empty name", async () => {
      const res = await request(app)
        .post("/api/v1/playlist/createPlaylist")
        .set(authHeader(token))
        .send({ name: "  ", description: "Test" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET USER PLAYLISTS ────────────────
  describe("GET /api/v1/playlist/user/:userId", () => {
    it("should return user playlists", async () => {
      await Playlist.create({
        name: "My List",
        description: "Desc",
        owner: userId,
      });

      const res = await request(app)
        .get(`/api/v1/playlist/user/${userId}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it("should return 404 when user has no playlists", async () => {
      const res = await request(app)
        .get(`/api/v1/playlist/user/${userId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid user ID", async () => {
      const res = await request(app)
        .get("/api/v1/playlist/user/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── GET PLAYLIST BY ID ────────────────
  describe("GET /api/v1/playlist/:playlistId", () => {
    it("should return playlist with videos", async () => {
      const pl = await Playlist.create({
        name: "Detail List",
        description: "Desc",
        owner: userId,
        videos: [video._id],
      });

      const res = await request(app)
        .get(`/api/v1/playlist/${pl._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.videos).toBeInstanceOf(Array);
      expect(res.body.data.videos.length).toBe(1);
    });

    it("should return 404 for non-existent playlist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/playlist/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid playlist ID", async () => {
      const res = await request(app)
        .get("/api/v1/playlist/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── UPDATE PLAYLIST ────────────────
  describe("PATCH /api/v1/playlist/:playlistId", () => {
    it("should update playlist name and description", async () => {
      const pl = await Playlist.create({
        name: "Old Name",
        description: "Old Desc",
        owner: userId,
      });

      const res = await request(app)
        .patch(`/api/v1/playlist/${pl._id}`)
        .set(authHeader(token))
        .send({ name: "New Name", description: "New Desc" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("New Name");
      expect(res.body.data.description).toBe("New Desc");
    });

    it("should return 400 for empty name", async () => {
      const pl = await Playlist.create({
        name: "Test",
        description: "Desc",
        owner: userId,
      });

      const res = await request(app)
        .patch(`/api/v1/playlist/${pl._id}`)
        .set(authHeader(token))
        .send({ name: "  ", description: "Desc" });

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent playlist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/playlist/${fakeId}`)
        .set(authHeader(token))
        .send({ name: "Test" });

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid playlist ID", async () => {
      const res = await request(app)
        .patch("/api/v1/playlist/bad-id")
        .set(authHeader(token))
        .send({ name: "Test" });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── DELETE PLAYLIST ────────────────
  describe("DELETE /api/v1/playlist/:playlistId", () => {
    it("should delete playlist", async () => {
      const pl = await Playlist.create({
        name: "Delete Me",
        description: "Desc",
        owner: userId,
      });

      const res = await request(app)
        .delete(`/api/v1/playlist/${pl._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent playlist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/playlist/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid playlist ID", async () => {
      const res = await request(app)
        .delete("/api/v1/playlist/bad-id")
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── ADD VIDEO TO PLAYLIST ────────────────
  describe("PATCH /api/v1/playlist/:playlistId/addPlaylistVideo/:videoId", () => {
    it("should add a video to playlist", async () => {
      const pl = await Playlist.create({
        name: "Add Video Test",
        description: "Desc",
        owner: userId,
      });

      const res = await request(app)
        .patch(`/api/v1/playlist/${pl._id}/addPlaylistVideo/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.videos).toContainEqual(video._id.toString());
    });

    it("should return 404 for non-existent playlist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/playlist/${fakeId}/addPlaylistVideo/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid playlist ID", async () => {
      const res = await request(app)
        .patch(`/api/v1/playlist/bad-id/addPlaylistVideo/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid video ID", async () => {
      const pl = await Playlist.create({
        name: "Test",
        description: "Desc",
        owner: userId,
      });

      const res = await request(app)
        .patch(`/api/v1/playlist/${pl._id}/addPlaylistVideo/bad-id`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────── REMOVE VIDEO FROM PLAYLIST ────────────────
  describe("PATCH /api/v1/playlist/:playlistId/removePlaylistVideo/:videoId", () => {
    it("should remove a video from playlist", async () => {
      const pl = await Playlist.create({
        name: "Remove Video Test",
        description: "Desc",
        owner: userId,
        videos: [video._id],
      });

      const res = await request(app)
        .patch(`/api/v1/playlist/${pl._id}/removePlaylistVideo/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.videos.length).toBe(0);
    });

    it("should return 404 for non-existent playlist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/playlist/${fakeId}/removePlaylistVideo/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid playlist ID", async () => {
      const res = await request(app)
        .patch(`/api/v1/playlist/bad-id/removePlaylistVideo/${video._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid video ID", async () => {
      const pl = await Playlist.create({
        name: "Test",
        description: "Desc",
        owner: userId,
      });

      const res = await request(app)
        .patch(`/api/v1/playlist/${pl._id}/removePlaylistVideo/bad-id`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });
});
