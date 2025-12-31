import mongoose from 'mongoose';
import Test from '../models/Test.js';
import type { ITest, ITestConfig } from '../models/Test.js';
import { TestStatus } from '../models/Test.js';
import ContentBlock from '../models/ContentBlock.js';
import type { IContentBlock } from '../models/ContentBlock.js';
import { ContentBlockType } from '../models/ContentBlock.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';

export class TestService {
  /**
   * Get available question counts grouped by type for specific topics
   */
  async getAvailableQuestionCounts(topicIds: string[]) {
    const objectIds = topicIds.map((id: string) => new mongoose.Types.ObjectId(id));
    
    // Aggregate to count by kind
    const counts = await ContentBlock.aggregate([
      { $match: { topicId: { $in: objectIds } } },
      { $group: { _id: '$kind', count: { $sum: 1 } } }
    ]);

    return counts.reduce((acc: Record<string, number>, curr: { _id: string, count: number }) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Create a new test with random questions based on config
   */
  /**
   * Create a new test with random questions based on config
   */
  async createTest(userId: string, config: ITestConfig): Promise<ITest> {
    const { selections, questionTypes, questionCount } = config as any; // Cast as any to access new selections prop if not in ITestConfig yet

    let topicObjectIds: mongoose.Types.ObjectId[] = [];

    // Branch 1: Legacy flat topicIds (for backward compatibility if needed)
    if (config.topicIds && config.topicIds.length > 0) {
        topicObjectIds = config.topicIds.map((id: any) => new mongoose.Types.ObjectId(id));
    } 
    // Branch 2: New Hierarchical Selections
    else if (selections && Array.isArray(selections)) {
        const resolvedIds = new Set<string>();

        // We can run these in parallel, but sequential is safer for now to avoid complexity
        for (const sel of selections) {
            const { spaceId, subjects } = sel;

            if (!subjects || subjects.length === 0) {
                // Implicit All Subjects in Space
                // Get all subjects in space
                const spaceSubjects = await Subject.find({ spaceId: spaceId }).select('_id');
                const spaceSubjectIds = spaceSubjects.map(s => s._id);
                // Get all topics in these subjects
                const spaceTopics = await Topic.find({ subjectId: { $in: spaceSubjectIds } }).select('_id');
                spaceTopics.forEach(t => resolvedIds.add(t._id.toString()));
            } else {
                // Specific Subjects
                for (const subSel of subjects) {
                    const { subjectId, topics } = subSel;
                    if (!topics || topics.length === 0) {
                         // Implicit All Topics in Subject
                         const currentSubjectTopics = await Topic.find({ subjectId: subjectId }).select('_id');
                         currentSubjectTopics.forEach(t => resolvedIds.add(t._id.toString()));
                    } else {
                         // Explicit Topics
                         topics.forEach((tid: string) => resolvedIds.add(tid));
                    }
                }
            }
        }
        topicObjectIds = Array.from(resolvedIds).map(id => new mongoose.Types.ObjectId(id));
    }

    if (topicObjectIds.length === 0) {
        throw new Error('No topics selected');
    }

    // Calculate how many questions per type we might want, or just random mix
    // For now, let's just pull random questions from the pool of selected topics and types
    
    const pipeline: any[] = [
      { 
        $match: { 
          topicId: { $in: topicObjectIds },
          kind: { $in: questionTypes }
        } 
      },
      { $sample: { size: questionCount } }
    ];

    const randomBlocks = await ContentBlock.aggregate(pipeline);

    if (randomBlocks.length < questionCount) {
      throw new Error(`Requested ${questionCount} questions, but only found ${randomBlocks.length} available for the selected criteria.`);
    }

    // Map blocks to test questions structure
    const questions = randomBlocks.map((block: IContentBlock) => ({
      blockId: block._id,
      blockSnapshot: block, // Store the state of the question
      userAnswer: null,
      isCorrect: false,
      marksObtained: 0
    }));

    const test = new Test({
      userId,
      config,
      questions,
      status: TestStatus.IN_PROGRESS,
      startTime: new Date(),
      totalMarks: questions.length // Assuming 1 mark per question for now
    });

    return await test.save();
  }

  /**
   * Get test by ID (verify ownership)
   */
  async getTestById(testId: string, userId: string): Promise<ITest | null> {
    return await Test.findOne({ _id: testId, userId });
  }

  /**
   * Get all tests for a user
   */
  async getTestsByUser(userId: string): Promise<ITest[]> {
    return await Test.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Submit test and calculate score
   */
  async submitTest(testId: string, userId: string, answers: Record<string, any>, warnings: any[]): Promise<ITest> {
    const test = await Test.findOne({ _id: testId, userId });
    if (!test) throw new Error('Test not found');

    if (test.status === TestStatus.COMPLETED) {
        throw new Error('Test already completed');
    }

    let score = 0;
    
    // Process answers
    test.questions.forEach((q: any) => {
      const qId = q.blockId.toString();
      const answer = answers[qId];
      q.userAnswer = answer;

      // Simple grading logic
      const block = q.blockSnapshot;
      
      let isCorrect = false;
      
      if (block.kind === ContentBlockType.SINGLE_SELECT_MCQ || block.kind === ContentBlockType.MULTI_SELECT_MCQ) {
         if (block.options && answer) {
             // For single select, answer might be option ID or string
             // For multi select, answer might be array
             
             // Simplest check: compare with correct options
             // Filter correct option IDs
             const correctOptionIds = block.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
             
             if (Array.isArray(answer)) {
                 // Multi-select exact match
                 const answerIds = answer;
                 isCorrect = answerIds.length === correctOptionIds.length && 
                             answerIds.every((id: string) => correctOptionIds.includes(id));
             } else {
                 // Single select
                 isCorrect = correctOptionIds.includes(answer);
             }
         }
      } else if (block.kind === ContentBlockType.DESCRIPTIVE) {
          // Cannot auto-grade descriptive strictly, assume manual or skip
          // For now, treat as 0 or strictly if exact match (rare)
          // Let's mark it as false/manual for now unless exact string match
          if (block.answer && answer === block.answer) {
              isCorrect = true;
          }
      }

      q.isCorrect = isCorrect;
      if (isCorrect) {
          q.marksObtained = 1; // Assuming 1 mark weight
          score += 1;
      } else {
          q.marksObtained = 0;
      }
    });

    test.score = score;
    test.status = TestStatus.COMPLETED;
    test.endTime = new Date();
    
    // Add any new warnings
    if (warnings && Array.isArray(warnings)) {
        test.warnings = warnings;
    }

    return await test.save();
  }
}

export default new TestService();
