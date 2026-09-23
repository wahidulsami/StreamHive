import { asyncHandler } from "../utils/asyncHandler.js";

import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import env from "../config/env.js";

export const optionalJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      req.user = null; 
      return next();
    }

    const decodedToken = jwt.verify(token, env.auth.accessTokenSecret);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    req.user = user || null; 
    next();
  } catch {
    req.user = null; 
    next();
  }
});
