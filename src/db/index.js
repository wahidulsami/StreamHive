import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import env from "../config/env.js";

const connectDB = async () => {
    try {
      const connectionInstance = await mongoose.connect(`${env.database.uri}/${DB_NAME}`);

      console.log(`mongodb connected !! DB host: ${connectionInstance.connection.host}`);
      
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

export default connectDB;
