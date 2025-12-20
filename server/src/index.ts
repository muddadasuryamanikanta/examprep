import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import helmet from 'helmet';
import morgan from 'morgan';

import './config/passport.ts';
import authRoutes from './routes/auth.routes.ts';
import contentRoutes from './routes/content.routes.ts';

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Stateless - no sessions needed for JWT
// app.use(session(...)) removed

// Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);

// Error Handling
import { errorHandler } from './middleware/error.middleware.ts';
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
