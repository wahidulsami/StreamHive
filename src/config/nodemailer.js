import nodemailer from 'nodemailer';
import env from './env.js';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false, 
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass
  }
});

// Test connection (skip in test environment to avoid ECONNREFUSED noise)
if (env.app.nodeEnv !== "test") {
  transporter.verify(function(error, success) {
     if (error) {
          console.log("SMTP Error:", error);
     } else {
          console.log("Server is ready to take messages");
     }
  });
}

export default transporter;
