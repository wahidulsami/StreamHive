import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import logger from "./log/logger.js";

dotenv.config({
  path: ".env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      logger.info(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    logger.error("Failed to connect to the database:", error);
    app.on("error", (error) => {
      logger.error("Error connecting to MongoDB:", error);
      throw error;
    });
  });
