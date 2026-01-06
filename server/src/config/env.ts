
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded (try to load from root if not already loaded)
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'ganeshknsml@gmail.com',
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_LAMBDA: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
};
