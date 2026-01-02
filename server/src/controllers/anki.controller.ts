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
                    easeFactor: 2.5,
                    intervalDays: 0,
                    repetitions: 0,
                    createdAt: now
                });
            }

            switch (rating) {
                case 'Again':
                    if (sr.repetitions === 0) {
                        sr.intervalDays = 1 / (24 * 60); // 1 minute
                    } else {
                        sr.repetitions = 0; // Reset
                        sr.intervalDays = 1 / (24 * 60); // Re-learning step 1
                    }
                    sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.2);
                    sr.nextReviewAt = now; // Due immediately (or +1 min)
                    break;

                case 'Hard':
                    if (sr.repetitions === 0) {
                        // New Card - "Hard" = 10m step
                        sr.intervalDays = 10 / (24 * 60); // 10 minutes
                        sr.repetitions = 0; // Still learning
                    } else {
                        // Review Card
                        sr.repetitions += 1;
                        if (sr.intervalDays < 0.01) sr.intervalDays = 1; // Was re-learning?
                        else sr.intervalDays = Math.max(1, sr.intervalDays * 1.2);
                    }

                    sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.15);
                    sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                    break;

                case 'Good':
                    if (sr.repetitions === 0) {
                        // New Card - "Good" = Graduate to 1 day
                        sr.intervalDays = 1;
                        sr.repetitions = 1; // Graduated
                    } else {
                        // Review Card
                        sr.repetitions += 1;
                        if (sr.intervalDays < 0.01) sr.intervalDays = 1;
                        else sr.intervalDays = Math.round(sr.intervalDays * sr.easeFactor);
                    }
                    sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                    break;

                case 'Easy':
                    if (sr.repetitions === 0) {
                        // New Card - "Easy" = Graduate to 4 days
                        sr.intervalDays = 4;
                        sr.repetitions = 1; // Graduated
                    } else {
                        // Review Card
                        sr.repetitions += 1;
                        if (sr.intervalDays < 0.01) sr.intervalDays = 4;
                        else {
                            // Standard Anki: Interval * Ease * EasyBonus (1.3)
                            sr.intervalDays = Math.round(sr.intervalDays * sr.easeFactor * 1.3);
                            sr.easeFactor += 0.15;
                        }
                    }
                    sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
                    break;
            }

            sr.easeFactor = Math.min(3.0, sr.easeFactor);
            sr.lastReviewedAt = now;
            await sr.save();

            res.status(200).json(sr);

        } catch (error) {
            console.error('Review Submit Error:', error);
            res.status(500).json({ message: 'Failed to submit review' });
        }
    }
}
