import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { generalLimiter } from "./middlewares/rateLimit.middlewares.js";

const app = express();

app.use(
  cors({
    origin: "https://totube.vercel.app",
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

app.use(express.static("public"));

app.use(cookieParser());

app.use(generalLimiter);

// routes import

import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import subscriptionRouter from "./routes/subscibe.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import channelRouter from "./routes/channel.route.js";
// routes use

app.use("/api/v1/users", userRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/tweet", tweetRouter);

app.use("/api/v1/channel", channelRouter);

export { app };
