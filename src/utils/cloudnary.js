import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("No file path provided to uploadCloudinary");
    }

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File does not exist at path: ${localFilePath}`);
    }

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      secure: true,
    });


    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return result;
  } catch (err) {
    console.error("❌ Cloudinary Upload Error Details:", {
      message: err.message,
      httpCode: err.http_code, 
      name: err.name,
    });

    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (unlinkErr) {
        console.error("Failed to delete local temporary file:", unlinkErr.message);
      }
    }
    
    throw err; 
  }
};