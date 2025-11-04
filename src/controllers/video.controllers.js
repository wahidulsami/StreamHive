import { User } from "../models/User.model.js";
import { Video } from "../models/Video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
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

  return res.status(200).json({
    statusCode: 200,
    success: true,
    message: "Videos fetched successfully",
    data: fetchedVideos,
  });
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Title and description are required",
    });
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      statusCode: 404,
      success: false,
      message: "User not found",
    });
  }

  const Filevideopath = req.files?.video?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!Filevideopath) {
    return res.status(400).json({
      statusCode: 400,
      success: false,

      message: "video is required",
    });
  }
  if (!thumbnailPath) {
    return res.status(404).json({
      statusCode: 400,
      success: false,
      message: "thumbnail is required",
    });
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
    return res.status(404).json({
      statusCode: 404,
      success: false,
      message: "failed to publish",
    });
  }

  return res.status(201).json({
    statusCode: 201,
    success: true,
    message: "Video published successfully",
    data: video,
  });
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user ? req.user._id : null;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid video id" });
  }

  // increment views
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
    return res.status(404).json({ success: false, message: "Video not found" });
  }

  // Check if user liked
  let isLiked = false;
  if (userId) {
    const like = await Like.findOne({ video: videoId, likedBy: userId });
    isLiked = !!like;
  }

  return res.status(200).json({
    success: true,
    message: "Video fetched successfully",
    data: {
      ...video[0],
      liked: isLiked,
    },
  });
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Invalid video id",
    });
  }

  let thumbnailURL;
  if (req.file?.path) {
    const uploadedThumbnail = await uploadCloudinary(req.file.path);
    thumbnailURL = uploadedThumbnail.secure_url;
  }

  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      ...(title && { title: title.trim() }),
      ...(description && { description: description.trim() }),
      ...(thumbnailURL && { thumbnail: thumbnailURL }),
    },
    { new: true }
  );

  if (!updateVideo) {
    return res.status(404).json({
      statusCode: 404,
      success: false,
      message: "Failed to update video",
    });
  }

  return res.status(200).json({
    statusCode: 200,
    success: true,
    message: "Video updated successfully",
    data: updateVideo,
  });
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Invalid video id",
    });
  }

  const video = await Video.findById(videoId);

  if (!video) {
    return res.status(404).json({
      statusCode: 404,
      success: false,
      message: "Video not found",
    });
  }

  // Check ownership before deletion
  if (video.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      statusCode: 403,
      success: false,
      message: "You are not authorized to delete this video",
    });
  }

  await video.deleteOne();

  return res.status(200).json({
    statusCode: 200,
    success: true,
    message: "Video deleted successfully",
    data: video,
  });
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Invalid video id",
    });
  }

  const video = await Video.findById(videoId);

  if (!video) {
    return res.status(404).json({
      statusCode: 404,
      success: false,
      message: "Video not found",
    });
  }

  video.isPublished = !video.isPublished;

  await video.save();
  return res.status(200).json({
    statusCode: 200,
    success: true,
    message: `Video is now ${video.isPublished ? "published" : "unpublished"}`,
    data: video,
  });
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
