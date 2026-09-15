import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import env from "../config/env.js";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, 
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      lowercase: true, 
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      default: "",
    },
    social: {
      url: { type: String, default: "" },
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      instagram: { type: String, default: "" },
    },
    avatar: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    resetOtp: {
      type: String,
      default: "",
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    resetOtpExpireAt: {
      type: Number,
      default: 0,
    },
    subscribersCount: {
      type: Number,
      default: 0,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// Password Hash Middleware
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method for checking password
UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Access Token Generation
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    env.auth.accessTokenSecret,
    {
      expiresIn: env.auth.accessTokenExpiry,
    }
  );
};

// Refresh Token Generation
UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    env.auth.refreshTokenSecret,
    {
      expiresIn: env.auth.refreshTokenExpiry,
    }
  );
};

export const User = mongoose.model("User", UserSchema);