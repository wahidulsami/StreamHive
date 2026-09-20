import rateLimit from "express-rate-limit";

// In test mode, bypass all rate limiters to avoid blocking repeated requests
const isTest = process.env.NODE_ENV === "test";
const passThrough = (req, res, next) => next();

export const generalLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests, please try again later.",
      },
    });

export const authLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many authentication attempts, please try again later.",
      },
    });

export const passwordResetLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many password reset attempts, please try again later.",
      },
    });
