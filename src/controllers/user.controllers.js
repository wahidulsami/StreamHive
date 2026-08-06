import { User } from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudnary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import transporter from "../config/nodemailer.js";
import { PASSWORD_RESET_TEMPLATE } from "../config/emailTemplates.js";

const genrateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    // হেল্পার ফাংশন থেকে Error throw করতে হয়, res.status ব্যবহার করা যাবে না
    throw new Error(error.message || "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  console.log("Files received:", req.files); // Multer দিয়ে আসা ফাইল
  console.log("Body received:", req.body);   // Form data (fullname, email, etc.)
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    return res
      .status(400)
      .json({ success: false, message: "mising details register" });
  }

  const existUSER = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existUSER) {
    return res
      .status(409)
      .json({
        success: false,
        message: "User already exists with this username or email",
      });
  }

  const avatarLocalpath = req.files?.avatar?.[0]?.path;
  const coverImageLocalpath = req.files?.coverImage?.[0]?.path;

  let avatar = null;
  if (avatarLocalpath) {
    avatar = await uploadCloudinary(avatarLocalpath);
    if (!avatar) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload avatar to Cloudinary",
      });
    }
  }

  // Upload cover image if provided
  let coverImage = null;
  if (coverImageLocalpath) {
    coverImage = await uploadCloudinary(coverImageLocalpath);
    if (!coverImage) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload cover to Cloudinary",
      });
    }
  }

const user = await User.create({
    fullname,
    avatar: avatar ? avatar.secure_url : "",
    coverImage: coverImage ? coverImage.secure_url : "",
    email,
    password,
    username: username.trim().toLowerCase(),
});


  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
const cookieOptions = {
  httpOnly: true,                
  secure: true,                  
  sameSite: "None",                
  maxAge: 24 * 60 * 60 * 1000,    
};
  const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(
    user._id
  );

  if (!createdUser) {
    return res.status(500).json({
      success: false,
      message: "Failed to createdUser user",
    });
  }

  return res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({
      success: true,
      message: "Account created successfully 🎉",
      data: {
        user: createdUser,
        accessToken,
        refreshToken,
      },
    });
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    return res
      .status(400)
      .json({ success: false, message: "Email and username are required" });
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const ispasswordvalidate = await user.ispasswordCorrect(password);
  if (!ispasswordvalidate) {
    return res
      .status(401)
      .json({ success: false, message: "Password is incorrect" });
  }

  const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(
    user._id
  );

  const logeedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

const cookieOptions = {
  httpOnly: true,                
  secure: true,                  
  sameSite: "None",                
  maxAge: 24 * 60 * 60 * 1000,    
};

  return res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({
      success: true,
      message: " logged in successfully",
      data: {
        user: logeedUser,
        accessToken,
        refreshToken,
      },
    });
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };


  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json({
      success: true,

      message: "User logout in successfully",
    });
});

const resetPasswordOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000; // 5 min

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password reset OTP",
      //       text: `Hello ${user.name},Your OTP for resetting your password is ${otp}.
      // Use this OTP to proceed with resetting your password`,
      html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace(
        "{{email}}",
        user.email
      ),
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ success: true, message: "resetPassworsOTP sent successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "resetPasswordOTP sent failed",
    });
  }
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!user.resetOtp || user.resetOtp !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  if (user.resetOtpExpireAt < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP expired" });
  }


  user.isOtpVerified = true;
  await user.save();

  return res.json({ success: true, message: "OTP verified. You can now reset your password." });
});


const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: "Email, OTP, and newPassword are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isOtpVerified || user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: "OTP not verified" });
    }

    if (user.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired, please request a new one" });
    }

    user.password = newPassword; // 🔒 Make sure you hash password in User model pre-save hook
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    user.isOtpVerified = false;

    await user.save();

    return res.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Reset password failed" });
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(404).json({success:false , message:"Refresh token not provided"})
            
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
     
    return res.status(404).json({success:false , message:"User not found"})
    }

    if (incomingRefreshToken !== user?.refreshToken) {
     
    return res.status(401).json({success:false , message:"Invalid refresh token"})

    }

 
  const cokiesOptions = {
  httpOnly: true,                  // JS can't access the cookie
  secure: true,                    // must be true in production (HTTPS)
  sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

    const { accessToken, newRefreshToken } = await genrateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, cokiesOptions)
      .cookie("refreshToken", newRefreshToken, cokiesOptions)
      .json({
  success: true,
  message: "Tokens refreshed successfully",
  accessToken ,
  refreshToken: newRefreshToken
});

  } catch (error) {
    return res.status(401).json({success:false , message:"Invalid refresh token"})
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const ispasswordCorrect = await user.ispasswordCorrect(oldPassword);

  if (!ispasswordCorrect) {
    return res
      .status(400)
      .json({ success: false, message: "password  is  incorrect" });
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json({ success: true, message: "Password changed successfully" });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");
  
  return res
    .status(200)
    .json({ success: true, data: user , message: "Current user fetched successfully" });
});

const updateAccoutDetails = asyncHandler(async (req, res) => {
  const { fullname, email, bio, social } = req.body;

  if (!fullname || !email) {
    return res.status(400).json({ success: false, message: "Fullname and email required" });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullname,
        email,
        bio: bio || "",
        "social.url": social?.url || "",
        "social.facebook": social?.facebook || "",
        "social.twitter": social?.twitter || "",
        "social.linkedin": social?.linkedin || "",
        "social.instagram": social?.instagram || ""
      },
    },
    { new: true }
  );

  res.status(200).json({ success: true, message: "Profile updated", user });
});

// TODO >>
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalpath = req.file?.path;

  // TODO delte old avatar from cloudinary

  if (!avatarLocalpath) {
    return res
      .status(400)
      .json({ success: false, message: "Avatar is required" });
  }
  const avatar = await uploadCloudinary(avatarLocalpath);
  if (!avatar) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to upload avatar to Cloudinary",
      });
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json({ success: true, message: "Avatar updated successfully" });
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalpath = req.file?.path;

  // TODO delte old coverImage from cloudinary

  if (!coverImageLocalpath) {
    return res
      .status(400)
      .json({ success: false, message: "cover is required" });
  }
  const coverImage = await uploadCloudinary(coverImageLocalpath);
  if (!coverImage) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to upload coverImage to Cloudinary",
      });
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.secure_url,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json({
    success: true,
    message: "Cover image updated successfully",
  });
});

// todo end



const getWatchhistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    data: user[0].watchHistory,
    message: "Watch history fetched successfully",
  });
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccoutDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getWatchhistory,
  resetPasswordOTP,
  verifyOTP,
  resetPassword,
};