
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Space from '../src/models/Space.ts';
import Subject from '../src/models/Subject.ts';
import Topic from '../src/models/Topic.ts';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function backfillTopicCounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const spaces = await Space.find({});
    console.log(`Found ${spaces.length} spaces. Starting update...`);

    for (const space of spaces) {
      // Find all subjects for this space
      const subjects = await Subject.find({ spaceId: space._id });
      const subjectIds = subjects.map(s => s._id);

      // Count topics that belong to these subjects
      const topicCount = await Topic.countDocuments({ subjectId: { $in: subjectIds } });

      // Update the space
      space.topicCount = topicCount;
      await space.save();

      console.log(`Updated space "${space.name}" (${space._id}): ${topicCount} topics`);
    }

    console.log('All spaces updated successfully.');
  } catch (error) {
    console.error('Error updating spaces:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

backfillTopicCounts();
