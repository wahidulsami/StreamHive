import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(8000),

  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // Auth - JWT
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXPIRY: z.string().default("1d"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRY: z.string().default("10d"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Email
  SENDER_EMAIL: z.string().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  → ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error(`\n✖ Missing or invalid environment variables:\n${formatted}\n`);
  process.exit(1);
}

const env = {
  server: {
    port: parsed.data.PORT,
  },
  database: {
    uri: parsed.data.MONGODB_URI,
  },
  auth: {
    accessTokenSecret: parsed.data.ACCESS_TOKEN_SECRET,
    accessTokenExpiry: parsed.data.ACCESS_TOKEN_EXPIRY,
    refreshTokenSecret: parsed.data.REFRESH_TOKEN_SECRET,
    refreshTokenExpiry: parsed.data.REFRESH_TOKEN_EXPIRY,
  },
  cloudinary: {
    cloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
    apiKey: parsed.data.CLOUDINARY_API_KEY,
    apiSecret: parsed.data.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
  },
  email: {
    sender: parsed.data.SENDER_EMAIL,
  },
  app: {
    nodeEnv: parsed.data.NODE_ENV,
    logLevel: parsed.data.LOG_LEVEL,
  },
};

export default env;
