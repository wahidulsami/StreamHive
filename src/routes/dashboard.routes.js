import { Router } from 'express';
import {
   getChannelStats,
    getChannelVideos,
    getChannelAnalytics,
    getRecentActivity,
    getTopVideo,
    getChannelComments
 } from '../controllers/dashborad.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStats);
router.route("/analytics").get(getChannelAnalytics);
router.route("/recent-activity").get(getRecentActivity);
router.route("/videos").get(getChannelVideos);
router.route("/top-video").get(getTopVideo);
router.route("/comments").get(getChannelComments);

export default router