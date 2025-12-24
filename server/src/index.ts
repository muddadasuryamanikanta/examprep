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
import aiRoutes from './routes/ai.routes.ts';

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));

// Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api/ai', aiRoutes);

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
