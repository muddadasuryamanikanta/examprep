
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Test from '@/models/Test.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the most recent test
    const test = await Test.findOne().sort({ createdAt: -1 });

    if (!test) {
      console.log('No tests found.');
      return;
    }

    console.log(`Found latest test: ${test._id}`);
    console.log(`Current isPending: ${test.config?.isPending}`);

    // Update isPending to true
    if (!test.config) {
        test.config = {} as any;
    }
    test.config.isPending = true;
    
    // Also ensuring other required fields are there to satisfy TS if needed, but likely fine strictly with Mongoose
    test.markModified('config');
    await test.save();

    console.log('Updated isPending to TRUE for the latest test.');
    console.log('Please refresh the test screen to see the buttons.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
