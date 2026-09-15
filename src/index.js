import env from "./config/env.js";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import logger from "./log/logger.js";

connectDB()
  .then(() => {
    app.listen(env.server.port, () => {
      logger.info(`Server is running on port ${env.server.port}`);
    });
  })
  .catch((error) => {
    logger.error("Failed to connect to the database:", error);
    app.on("error", (error) => {
      logger.error("Error connecting to MongoDB:", error);
      throw error;
    });
  });
