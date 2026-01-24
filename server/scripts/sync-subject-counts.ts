import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import { generateIconForSubject } from '@/utils/common.ts';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

async function syncSubjectCounts() {
  await connectDB();

  try {
    const subjects = await Subject.find({});
    console.log(`Found ${subjects.length} subjects to sync.`);

    for (const subject of subjects) {
      // 1. Count Topics
      const topicCount = await Topic.countDocuments({ subjectId: subject._id });

      // 2. Count Questions (McqBlock, DescriptiveBlock)
      const topics = await Topic.find({ subjectId: subject._id }).select('_id');
      const topicIds = topics.map(t => t._id);

      const questionCount = await ContentBlock.countDocuments({
        topicId: { $in: topicIds },
        kind: { $in: ['single_select_mcq', 'multi_select_mcq', 'descriptive'] } 
      });

      // 3. Update Subject Counts
      subject.topicCount = topicCount;
      subject.questionCount = questionCount;
      
      // 4. Update Icon using AI if it's the default or missing
      const aiIcon = await generateIconForSubject(subject.title);
      if (aiIcon && aiIcon !== 'Book') {
          subject.icon = aiIcon;
      }

      await subject.save();
      console.log(`Updated ${subject.title}: ${topicCount} topics, ${questionCount} questions, Icon: ${subject.icon}`);
    }

    // Topic icon sync skipped as per user request to keep defaults
    console.log('✅ Sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing counts:', error);
    process.exit(1);
  }
}

syncSubjectCounts();
