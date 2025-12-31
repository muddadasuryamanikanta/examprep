import mongoose from 'mongoose';
import Test from '../models/Test.js';
import type { ITest, ITestConfig } from '../models/Test.js';
import { TestStatus } from '../models/Test.js';
import ContentBlock from '../models/ContentBlock.js';
import type { IContentBlock } from '../models/ContentBlock.js';
import { ContentBlockType } from '../models/ContentBlock.js';

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
  async createTest(userId: string, config: ITestConfig): Promise<ITest> {
    const { topicIds, questionTypes, questionCount } = config;
    const topicObjectIds = topicIds.map((id: any) => new mongoose.Types.ObjectId(id));

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

    if (randomBlocks.length === 0) {
      throw new Error('No questions available for the selected criteria');
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
      status: TestStatus.CREATED,
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
