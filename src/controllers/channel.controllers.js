import { User } from "../models/User.model.js";
import { Video } from "../models/Video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getChannelByusername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const user = await User.findOne({ username }).select(
    "-password -refreshToken -resetOtp -resetOtpExpireAt -isOtpVerified -email"
  );

  if (!user) {
    throw new ApiError(404, "Channel not found");
  }

  const videos = await Video.find({ owner: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      { user, videos },
      "Channel fetched successfully"
    )
  );
});
