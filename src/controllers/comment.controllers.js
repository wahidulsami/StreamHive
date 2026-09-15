import mongoose from "mongoose";
import { Comment } from "../models/Comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const commentQuery = Comment.aggregate([
    { $match: { video: videoId } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { username: 1, avatar: 1, _id: 1 } }],
      },
    },
    { $unwind: "$owner" },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parentComment",
        as: "replies",
        pipeline: [
          { $sort: { createdAt: 1 } },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [{ $project: { username: 1, avatar: 1, _id: 1 } }],
            },
          },
          { $unwind: "$owner" },
        ],
      },
    },
  ]);

  const paginate = await Comment.aggregatePaginate(commentQuery, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, paginate, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentCommentId } = req.body;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  let parentComment = null;
  if (parentCommentId) {
    if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
      throw new ApiError(400, "Invalid parent comment ID");
    }
    parentComment = parentCommentId;
  }

  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
    parentComment,
  });

  const populatedComment = await Comment.findById(newComment._id).populate(
    "owner",
    "username avatar _id"
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      populatedComment,
      parentComment ? "Reply added successfully" : "Comment created successfully"
    )
  );
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const existComment = await Comment.findById(commentId);

  if (!existComment) {
    throw new ApiError(404, "Comment not found");
  }

  if (existComment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { content },
    { new: true }
  ).populate("owner", "username avatar");

  if (!updatedComment) {
    throw new ApiError(500, "Failed to update comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComments = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const existComment = await Comment.findById(commentId);

  if (!existComment) {
    throw new ApiError(404, "Comment not found");
  }

  if (existComment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  if (!deletedComment) {
    throw new ApiError(500, "Failed to delete comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComments };
