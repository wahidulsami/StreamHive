import { User } from "../models/User.model.js";
import { Video } from "../models/Video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadCloudinary } from "../utils/cloudnary.js";
import mongoose from "mongoose";
import { Like } from "../models/Like.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const match = {};
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    match.owner = new mongoose.Types.ObjectId(userId);
  }

  const aggregate = Video.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    {
      $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        "owner._id": 1,
        "owner.fullname": 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const fetchedVideos = await Video.aggregatePaginate(aggregate, {
    limit: parseInt(limit),
    page: parseInt(page),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, fetchedVideos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const Filevideopath = req.files?.video?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!Filevideopath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const uploadVideo = await uploadCloudinary(Filevideopath);
  const uploadThumbnail = await uploadCloudinary(thumbnailPath);

  const duration_video = uploadVideo.duration.toFixed(0);

  const video = await Video.create({
    title,
    description,
    videoFile: uploadVideo ? uploadVideo.secure_url : "",
    thumbnail: uploadThumbnail ? uploadThumbnail.secure_url : "",
    owner: user._id,
    duration: duration_video,
    isPublished: false,
  });

  if (!video) {
    throw new ApiError(500, "Failed to publish video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user ? req.user._id : null;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

  const video = await Video.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        videoFile: 1,
        likesCount: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          _id: "$userDetails._id",
          fullname: "$userDetails.fullname",
          username: "$userDetails.username",
          avatar: "$userDetails.avatar",
          subscribersCount: "$userDetails.subscribersCount",
        },
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  let isLiked = false;
  if (userId) {
    const like = await Like.findOne({ video: videoId, likedBy: userId });
    isLiked = !!like;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { ...video[0], liked: isLiked },
      "Video fetched successfully"
    )
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  let thumbnailURL;
  if (req.file?.path) {
    const uploadedThumbnail = await uploadCloudinary(req.file.path);
    thumbnailURL = uploadedThumbnail.secure_url;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      ...(title && { title: title.trim() }),
      ...(description && { description: description.trim() }),
      ...(thumbnailURL && { thumbnail: thumbnailURL }),
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      video,
      `Video is now ${video.isPublished ? "published" : "unpublished"}`
    )
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
