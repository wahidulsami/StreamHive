import mongoose from "mongoose";
import { Subscription } from "../models/Subcripation.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  if (userId.toString() === channelId) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  let subscribed;
  let updatedChannel;

  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);
    updatedChannel = await User.findByIdAndUpdate(
      channelId,
      { $inc: { subscribersCount: -1 } },
      { new: true, projection: { subscribersCount: 1 } }
    );
    subscribed = false;
  } else {
    await Subscription.create({ subscriber: userId, channel: channelId });
    updatedChannel = await User.findByIdAndUpdate(
      channelId,
      { $inc: { subscribersCount: 1 } },
      { new: true, projection: { subscribersCount: 1 } }
    );
    subscribed = true;
  }

  if (updatedChannel && updatedChannel.subscribersCount < 0) {
    updatedChannel.subscribersCount = 0;
    await updatedChannel.save();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channelId,
        subscribed,
        subscribersCount: updatedChannel?.subscribersCount || 0,
      },
      subscribed ? "Subscribed successfully" : "Unsubscribed successfully"
    )
  );
});

const getUserChannelsubscribersCount = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId).select("subscribersCount");
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { subscribersCount: channel.subscribersCount || 0 },
      "Subscribers count fetched successfully"
    )
  );
});

const getSubscribedChannelsData = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscribed = await Subscription.aggregate([
    { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
      },
    },
    { $unwind: "$channelDetails" },
    {
      $project: {
        _id: 0,
        channelId: "$channelDetails._id",
        fullname: "$channelDetails.fullname",
        username: "$channelDetails.username",
        email: "$channelDetails.email",
        avatar: "$channelDetails.avatar",
        subscribersCount: "$channelDetails.subscribersCount",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribed, "Subscribed channels fetched successfully"));
});

const getChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscribers = await Subscription.aggregate([
    { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    { $unwind: "$subscriberDetails" },
    {
      $project: {
        _id: 0,
        userId: "$subscriberDetails._id",
        fullname: "$subscriberDetails.fullname",
        username: "$subscriberDetails.username",
        avatar: "$subscriberDetails.avatar",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribers, "Channel subscribers fetched successfully"));
});

const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const existing = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(200, { subscribed: !!existing }, "Subscription status checked")
  );
});

export {
  toggleSubscription,
  getUserChannelsubscribersCount,
  getSubscribedChannelsData,
  getChannelSubscribers,
  checkSubscriptionStatus,
};
