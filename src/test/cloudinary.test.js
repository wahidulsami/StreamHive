/**
 * Cloudinary Utility Unit Tests
 *
 * Tests: uploadCloudinary success, error handling, file cleanup
 * Mocks: cloudinary.v2, fs (via jest.unstable_mockModule)
 */
import { jest } from "@jest/globals";
import fs from "fs";

// Mock cloudinary and fs before importing the module under test
jest.unstable_mockModule("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: jest.fn().mockReturnValue(true),
    unlinkSync: jest.fn(),
  },
}));

const cloudinary = await import("cloudinary");
const fsMock = await import("fs");
const { uploadCloudinary } = await import("../utils/cloudnary.js");

describe("uploadCloudinary utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fsMock.default.existsSync.mockReturnValue(true);
    cloudinary.v2.uploader.upload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/test/video/upload/v1/test.mp4",
      duration: 120.5,
    });
  });

  it("should upload a file and return the result", async () => {
    const result = await uploadCloudinary("/tmp/test.mp4");

    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
      "/tmp/test.mp4",
      { resource_type: "auto", secure: true }
    );
    expect(result).toEqual({
      secure_url: "https://res.cloudinary.com/test/video/upload/v1/test.mp4",
      duration: 120.5,
    });
  });

  it("should throw when no file path is provided", async () => {
    await expect(uploadCloudinary(undefined)).rejects.toThrow(
      "No file path provided to uploadCloudinary"
    );
    await expect(uploadCloudinary(null)).rejects.toThrow(
      "No file path provided to uploadCloudinary"
    );
  });

  it("should throw when file does not exist on disk", async () => {
    fsMock.default.existsSync.mockReturnValue(false);

    await expect(uploadCloudinary("/tmp/missing.mp4")).rejects.toThrow(
      "File does not exist at path"
    );
  });

  it("should delete the temp file after successful upload", async () => {
    await uploadCloudinary("/tmp/test.mp4");

    expect(fsMock.default.unlinkSync).toHaveBeenCalledWith("/tmp/test.mp4");
  });

  it("should delete the temp file even when upload fails", async () => {
    cloudinary.v2.uploader.upload.mockRejectedValue(
      new Error("Upload failed")
    );

    await expect(uploadCloudinary("/tmp/test.mp4")).rejects.toThrow(
      "Upload failed"
    );
    expect(fsMock.default.unlinkSync).toHaveBeenCalledWith("/tmp/test.mp4");
  });
});
