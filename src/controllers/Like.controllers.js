import mongoose from "mongoose";
import { Like } from "../models/Like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/Comment.model.js";
import { Video } from "../models/Video.model.js";
import { Tweet } from "../models/Tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const videoExists = await Video.findById(videoId).select("_id likesCount");
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingLike = await Like.findOne({
      video: videoId,
      likedBy: userId,
    }).session(session);
    let liked, updated;

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id }, { session });
      updated = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { likesCount: -1 } },
        { new: true, session, projection: { likesCount: 1 } }
      );
      liked = false;
    } else {
      await Like.create(
        [{ video: videoId, comment: undefined, tweet: undefined, likedBy: userId }],
        { session }
      );
      updated = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { likesCount: 1 } },
        { new: true, session, projection: { likesCount: 1 } }
      );
      liked = true;
    }

    if (updated.likesCount < 0) {
      updated.likesCount = 0;
      await updated.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(
        200,
        { videoId, liked, likesCount: updated.likesCount },
        liked ? "Video liked successfully" : "Video unliked successfully"
      )
    );
  } catch {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(500, "Failed to toggle video like");
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const commentExists = await Comment.findById(commentId).select("_id likesCount");
  if (!commentExists) {
    throw new ApiError(404, "Comment not found");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    }).session(session);
    let liked, updated;

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id }, { session });
      updated = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likesCount: -1 } },
        { new: true, session, projection: { likesCount: 1 } }
      );
      liked = false;
    } else {
      await Like.create([{ comment: commentId, likedBy: userId }], { session });
      updated = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likesCount: 1 } },
        { new: true, session, projection: { likesCount: 1 } }
      );
      liked = true;
    }

    if (updated.likesCount < 0) {
      updated.likesCount = 0;
      await updated.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(
        200,
        { commentId, liked, likesCount: updated.likesCount },
        liked ? "Comment liked successfully" : "Comment unliked successfully"
      )
    );
  } catch {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(500, "Failed to toggle comment like");
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweetExists = await Tweet.findById(tweetId).select("_id likesCount");
  if (!tweetExists) {
    throw new ApiError(404, "Tweet not found");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingLike = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    }).session(session);

    let liked, updated;

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id }, { session });
      updated = await Tweet.findByIdAndUpdate(
        tweetId,
        { $inc: { likesCount: -1 } },
        { new: true, session, projection: { likesCount: 1 } }
      );
      liked = false;
    } else {
      await Like.create(
        [{ tweet: tweetId, video: undefined, comment: undefined, likedBy: userId }],
        { session }
      );
      updated = await Tweet.findByIdAndUpdate(
        tweetId,
        { $inc: { likesCount: 1 } },
        { new: true, session, projection: { likesCount: 1 } }
      );
      liked = true;
    }

    if (updated.likesCount < 0) {
      updated.likesCount = 0;
      await updated.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(
        200,
        { tweetId, liked, likesCount: updated.likesCount },
        liked ? "Tweet liked successfully" : "Tweet unliked successfully"
      )
    );
  } catch {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(500, "Failed to toggle tweet like");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "LikedvideosData",
      },
    },
    { $unwind: "$LikedvideosData" },
    {
      $project: {
        _id: 0,
        video: "$LikedvideosData",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

const getUserLikedComments = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likes = await Like.find({ comment: { $ne: null }, likedBy: userId }).select(
    "comment likedBy"
  );

  const likedComments = likes.map((l) => l.comment);

  return res
    .status(200)
    .json(new ApiResponse(200, likedComments, "Liked comments fetched successfully"));
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  getUserLikedComments,
};
