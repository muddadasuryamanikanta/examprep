import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import SpacedRepetition from '../models/Anki.ts';
import ContentBlock, { ContentBlockType } from '../models/ContentBlock.ts';
import Topic from '../models/Topic.ts';

export class AnkiController {

    static async getSession(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const userId = user._id;
            const { spaceId, subjectId, topicId, limit = 20 } = req.query;

            // 1. Determine Scope (Topic IDs)
            let topicIds: mongoose.Types.ObjectId[] = [];

            if (topicId) {
                topicIds = [new mongoose.Types.ObjectId(String(topicId))];
            } else if (subjectId) {
                // Find all topics in subject
                const topics = await Topic.find({ subjectId: subjectId }).select('_id');
                topicIds = topics.map(t => t._id as mongoose.Types.ObjectId);
            } else {
                if (!spaceId) return res.status(400).json({ message: "Context required (topicId or subjectId)" });
            }

            const limitNum = Number(limit);

            const validTypes = [ContentBlockType.SINGLE_SELECT_MCQ, ContentBlockType.MULTI_SELECT_MCQ, ContentBlockType.FILL_IN_THE_BLANK];

            // Use lean() to get POJOs
            const candidateQuestions = await ContentBlock.find({
                topicId: { $in: topicIds },
                kind: { $in: validTypes }
            }).select('_id kind question options blankAnswers topicId explanation hints').lean();

            const candidateIds = candidateQuestions.map(c => c._id);

            // Step B: Find DUE items from these candidates
            const now = new Date();
            const dueReviews = await SpacedRepetition.find({
                userId,
                questionId: { $in: candidateIds },
                nextReviewAt: { $lte: now }
            }).limit(limitNum).populate('questionId').lean();

            // Step C: Find NEW items (Candidates with NO SpacedRepetition doc)
            let responseItems: any[] = [...dueReviews];

            if (responseItems.length < limitNum) {
                const allUserReviewsForCandidates = await SpacedRepetition.find({
                    userId,
                    questionId: { $in: candidateIds }
                }).select('questionId').lean();

                const reviewedIds = new Set(allUserReviewsForCandidates.map((r: any) => r.questionId.toString()));

                const newQuestions = candidateQuestions
                    .filter(q => !reviewedIds.has(q._id.toString()))
                    .slice(0, limitNum - responseItems.length);

                const newItemsMapped = newQuestions.map(q => ({
                    _id: null,
                    userId,
                    questionId: q,
                    isNew: true,
                    easeFactor: 2.5,
                    intervalDays: 0,
                    repetitions: 0
                }));

                responseItems = [...responseItems, ...newItemsMapped];
            }

            // ... (keep existing logic for responseItems)

            // Step D: Calculate Total Counts (for UI "X / Total")
            const totalDueCount = await SpacedRepetition.countDocuments({
                userId,
                questionId: { $in: candidateIds },
                nextReviewAt: { $lte: now }
            });

            const totalCandidateCount = candidateIds.length;
            const totalReviewedCount = await SpacedRepetition.countDocuments({
                userId,
                questionId: { $in: candidateIds }
            });
            const totalNewCount = Math.max(0, totalCandidateCount - totalReviewedCount);

            const totalCount = totalDueCount + totalNewCount;

            res.status(200).json({
                items: responseItems,
                total: totalCount
            });

        } catch (error) {
            console.error('Anki Session Error:', error);
            res.status(500).json({ message: 'Failed to fetch session' });
        }
    }

    static async submitReview(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const userId = user._id;
            const { questionId, rating } = req.body; // rating: 'Again' | 'Hard' | 'Good' | 'Easy'

            if (!questionId || !rating) {
                return res.status(400).json({ message: 'Missing questionId or rating' });
            }

            let sr = await SpacedRepetition.findOne({ userId, questionId });
            const now = new Date();

            if (!sr) {
                // CREATE NEW
                sr = new SpacedRepetition({
                    userId,
                    questionId,
                    state: 'new',
                    easeFactor: 2.5,
                    intervalDays: 0,
                    repetitions: 0,
                    createdAt: now
                });
            }

            // Defaults matching Anki
            const STEP_1 = 1 / (24 * 60); // 1 min
            const STEP_2 = 10 / (24 * 60); // 10 min
            const GRADUATING_IVL = 1;
            const EASY_IVL = 4;
            const NEW_INTERVAL = 0; // Config for lapsed cards logic if needed

            switch (sr.state) {
                case 'new':
                case 'learning':
                    // --- LEARNING PHASE ---
                    switch (rating) {
                        case 'Again':
                            sr.state = 'learning';
                            sr.intervalDays = STEP_1;
                            sr.repetitions = 0;
                            // Ease doesn't change in learning usually, but we can decrement slightly or keep
                            break;
                            
                        case 'Hard':
                            sr.state = 'learning';
                            // Avg of (1m, 10m) = ~5.5m -> 6m
                            sr.intervalDays = 6 / (24 * 60);
                            break;

                        case 'Good':
                            if (sr.intervalDays < STEP_2 - 0.0001) {
                                // Step 1 -> Step 2
                                sr.state = 'learning';
                                sr.intervalDays = STEP_2;
                            } else {
                                // Graduate
                                sr.state = 'review';
                                sr.intervalDays = GRADUATING_IVL;
                                sr.repetitions = 1;
                            }
                            break;

                        case 'Easy':
                            // Graduate Immediately
                            sr.state = 'review';
                            sr.intervalDays = EASY_IVL;
                            sr.repetitions = 1;
                            break;
                    }
                    // Next review relative to NOW for learning steps
                    sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                    break;

                case 'review':
                    // --- REVIEW PHASE ---
                    switch (rating) {
                        case 'Again':
                            // LAPSE -> Relearning
                            sr.state = 'relearning';
                            sr.intervalDays = STEP_2; // Relearn default is 10m in standard Anki
                            sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.2);
                            sr.repetitions = 0; // Reset count? Or keep lapse count? Anki tracks lapses.
                            // In this simple model, we reset reps for "streak", but keeps High Level details in Ease
                            break;

                        case 'Hard':
                            sr.state = 'review';
                            sr.intervalDays = Math.max(1, sr.intervalDays * 1.2);
                            sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.15);
                            sr.repetitions += 1;
                            break;

                        case 'Good':
                            sr.state = 'review';
                            sr.intervalDays = Math.round(sr.intervalDays * sr.easeFactor);
                            sr.repetitions += 1;
                            break;

                        case 'Easy':
                            sr.state = 'review';
                            sr.intervalDays = Math.round(sr.intervalDays * sr.easeFactor * 1.3);
                            sr.easeFactor += 0.15;
                            sr.repetitions += 1;
                            break;
                    }
                    
                    if (sr.state === 'relearning') {
                         sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                    } else {
                         // Review cards are usually scheduled from NOW (or from scheduled time? Anki V2 vs V3).
                         // Using NOW for simplicity and robustness.
                         sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                    }
                    break;

                case 'relearning':
                     // --- RELEARNING PHASE ---
                     // Typically 1 step (10m) -> Back to Review with new Interval
                     switch(rating) {
                         case 'Again':
                             sr.intervalDays = STEP_1; // 1m
                             // Stay in relearning
                             break;
                         case 'Good':
                             // Exit relearning. 
                             // New Interval = Old Interval * New Interval % (default 0%)? 
                             // Or just 1 day?
                             // Anki default: New Interval = 1 d. 
                             sr.state = 'review';
                             sr.intervalDays = 1; 
                             break;
                         case 'Easy':
                             sr.state = 'review';
                             sr.intervalDays = 4;
                             break;
                         case 'Hard':
                             sr.intervalDays = 6 / (24 * 60);
                             break;
                     }
                     sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                     break;
            }

            sr.easeFactor = Math.min(3.0, Math.max(1.3, sr.easeFactor));
            sr.lastReviewedAt = now;
            await sr.save();

            res.status(200).json(sr);
        } catch (error) {
            console.error('Review Submit Error:', error);
            res.status(500).json({ message: 'Failed to submit review' });
        }
    }
}
