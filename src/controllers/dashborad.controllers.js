import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/Video.model.js";
import { User } from "../models/User.model.js";
import { Comment } from "../models/Comment.model.js";
import { Like } from "../models/Like.model.js";
import { Subscription } from "../models/Subcripation.model.js";

const getMonthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const buildMonthlySeries = (documents, valueSelector) => {
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
  });

  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index));

    return {
      key: getMonthKey(date),
      label: monthFormatter.format(date),
      value: 0,
    };
  });

  const seriesMap = new Map(months.map((month) => [month.key, month]));

  documents.forEach((document) => {
    const month = seriesMap.get(getMonthKey(new Date(document.createdAt)));

    if (month) {
      month.value += valueSelector(document);
    }
  });

  return {
    labels: months.map((month) => month.label),
    values: months.map((month) => month.value),
  };
};

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found",
    });
  }

  const channelStats = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalVideos: { $size: { $ifNull: ["$videos", []] } },
        totalViews: {
          $sum: {
            $map: {
              input: { $ifNull: ["$videos", []] },
              as: "video",
              in: { $ifNull: ["$$video.views", 0] },
            },
          },
        },
        totalLikes: {
          $sum: {
            $map: {
              input: { $ifNull: ["$videos", []] },
              as: "video",
              in: { $size: { $ifNull: ["$$video.likes", []] } },
            },
          },
        },
        totalSubscribers: { $size: { $ifNull: ["$subscribers", []] } },
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        totalVideos: 1,
        totalViews: 1,
        totalLikes: 1,
        totalSubscribers: 1,
      },
    },
  ]);

  if (!channelStats.length) {
    return res.status(404).json({
      success: false,
      message: "Channel not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Channel stats fetched successfully",
    data: channelStats[0],
  });
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found",
    });
  }

  const allVideos = await Video.find({ owner: channelId }).sort({ createdAt: -1 });
  const latestVideos = allVideos.slice(0, 10);
  const topVideos = [...allVideos]
    .sort((leftVideo, rightVideo) => {
      const viewDifference = (rightVideo.views || 0) - (leftVideo.views || 0);

      if (viewDifference !== 0) {
        return viewDifference;
      }

      return (rightVideo.likesCount || 0) - (leftVideo.likesCount || 0);
    })
    .slice(0, 10);
  const draftVideos = allVideos.filter((video) => !video.isPublished);

  return res.status(200).json({
    success: true,
    message: "Channel videos fetched successfully",
    data: {
      latestVideos,
      topVideos,
      draftVideos,
    },
  });
});

const getChannelAnalytics = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found",
    });
  }

  const channelObjectId = new mongoose.Types.ObjectId(channelId);
  const videos = await Video.find({ owner: channelObjectId }).select(
    "_id views createdAt"
  );
  const videoIds = videos.map((video) => video._id);

  const [likes, subscribers] = await Promise.all([
    videoIds.length
      ? Like.find({ video: { $in: videoIds } }).select("createdAt")
      : [],
    Subscription.find({ channel: channelObjectId }).select("createdAt"),
  ]);

  const monthlyViews = buildMonthlySeries(videos, (video) => video.views || 0);
  const monthlyLikes = buildMonthlySeries(likes, () => 1);
  const monthlySubscribers = buildMonthlySeries(subscribers, () => 1);

  return res.status(200).json({
    success: true,
    message: "Channel analytics fetched successfully",
    data: {
      monthlyViews,
      monthlyLikes,
      monthlySubscribers,
    },
  });
});

const getRecentActivity = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found",
    });
  }

  const channelObjectId = new mongoose.Types.ObjectId(channelId);
  const videos = await Video.find({ owner: channelObjectId }).select(
    "_id title thumbnail views likesCount isPublished createdAt"
  );
  const videoIds = videos.map((video) => video._id);
  const videoMap = new Map(videos.map((video) => [String(video._id), video]));
  const videoIdStrings = videoIds.map((videoId) => String(videoId));

  const [recentComments, recentLikes, recentSubscribers] = await Promise.all([
    videoIdStrings.length
      ? Comment.find({ video: { $in: videoIdStrings } })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate({ path: "owner", select: "username fullname avatar" })
      : [],
    videoIds.length
      ? Like.find({ video: { $in: videoIds } })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate({ path: "likedBy", select: "username fullname avatar" })
          .populate({ path: "video", select: "title thumbnail views likesCount isPublished" })
      : [],
    Subscription.find({ channel: channelObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({ path: "subscriber", select: "username fullname avatar" }),
  ]);

  return res.status(200).json({
    success: true,
    message: "Recent activity fetched successfully",
    data: {
      comments: recentComments.map((comment) => ({
        ...comment.toObject(),
        video: videoMap.get(String(comment.video)) || null,
      })),
      likes: recentLikes,
      subscribers: recentSubscribers,
    },
  });
});

const getTopVideo = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found",
    });
  }

  const topVideo = await Video.findOne({ owner: channelId }).sort({
    views: -1,
    likesCount: -1,
    createdAt: -1,
  });

  if (!topVideo) {
    return res.status(404).json({
      success: false,
      message: "No videos found",
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Top video fetched successfully",
    data: topVideo,
  });
});

const getChannelComments = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found",
    });
  }

  const channelObjectId = new mongoose.Types.ObjectId(channelId);
  const videos = await Video.find({ owner: channelObjectId }).select(
    "_id title thumbnail views likesCount isPublished createdAt"
  );
  const videoMap = new Map(videos.map((video) => [String(video._id), video]));
  const videoIds = videos.map((video) => String(video._id));

  if (!videoIds.length) {
    return res.status(200).json({
      success: true,
      message: "Latest comments fetched successfully",
      data: [],
    });
  }

  const comments = await Comment.find({ video: { $in: videoIds } })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({ path: "owner", select: "username fullname avatar" });

  return res.status(200).json({
    success: true,
    message: "Latest comments fetched successfully",
    data: comments.map((comment) => ({
      ...comment.toObject(),
      video: videoMap.get(String(comment.video)) || null,
    })),
  });
}); 


export {
  getChannelStats,
  getChannelVideos,
  getChannelAnalytics,
  getRecentActivity,
  getTopVideo,
  getChannelComments,
};
