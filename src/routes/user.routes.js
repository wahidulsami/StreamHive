import { Router } from "express";
import {
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

} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimit.middlewares.js";
import { validate } from "../middlewares/validation.middlewares.js";
import {
  registerSchema,
  loginSchema,
  resetPasswordOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validators.js";
const router = Router();


router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);


router.route("/login").post(authLimiter, validate(loginSchema), loginUser);


// seccure route

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(authLimiter, refreshAccessToken);
router.route("/reset-password-otp").post(passwordResetLimiter, validate(resetPasswordOtpSchema), resetPasswordOTP);
router.route("/verify-otp").post(passwordResetLimiter, validate(verifyOtpSchema), verifyOTP);
router.route("/reset-password").post(passwordResetLimiter, validate(resetPasswordSchema), resetPassword);
router.route("/change-password").post(verifyJWT, validate(changePasswordSchema), changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").patch(verifyJWT, updateAccoutDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-cover")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/watch-history").get(verifyJWT, getWatchhistory);

export default router;