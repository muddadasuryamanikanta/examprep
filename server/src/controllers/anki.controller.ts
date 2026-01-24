import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import SpacedRepetition from '@/models/Anki.ts';
import ContentBlock, { ContentBlockType } from '@/models/ContentBlock.ts';
import Topic from '@/models/Topic.ts';
import { createEmptyCard, FSRS, Rating, State, generatorParameters } from 'ts-fsrs';
import type { Card } from 'ts-fsrs';

export class AnkiController {

    static async getSession(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) throw new Error('User not found');
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
            // "Real Anki" Logic: Learn Ahead Limit (default 20 mins)
            // If a card is due in 1 min, and we have nothing else, we should show it instead of "Finished".
            // We fetch cards due up to 20 mins in the future to allow "scanning ahead".
            const now = new Date();
            const LEARN_AHEAD_MS = 20 * 60 * 1000; // 20 minutes
            const cutoff = new Date(now.getTime() + LEARN_AHEAD_MS);

            const dueReviews = await SpacedRepetition.find({
                userId,
                questionId: { $in: candidateIds },
                nextReviewAt: { $lte: cutoff }
            })
                // Sort by Due Date ASC so strictly due items appear before "ahead" items
                .sort({ nextReviewAt: 1 })
                .limit(limitNum)
                .populate('questionId')
                .lean();

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

            // Step D: Calculate Total Counts (for UI "X / Total")
            // Consistent with the session fetch, we count everything in the Learn Ahead window as "Due"
            const totalDueCount = await SpacedRepetition.countDocuments({
                userId,
                questionId: { $in: candidateIds },
                nextReviewAt: { $lte: cutoff }
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
            const user = req.user;
            if (!user) throw new Error('User not found');
            const userId = user._id;
            const { questionId, rating } = req.body; // rating: 'Again' | 'Hard' | 'Good' | 'Easy'

            if (!questionId || !rating) {
                return res.status(400).json({ message: 'Missing questionId or rating' });
            }

            let sr = await SpacedRepetition.findOne({ userId, questionId });
            const now = new Date();

            // 1. Initialize FSRS
            const params = generatorParameters({ enable_fuzz: true }); // Default Anki parameters
            const fsrs = new FSRS(params);

            let card: Card;

            if (!sr) {
                // Should not happen theoretically if flow is correct, but handle NEW card case
                // Create a clean "New" card
                card = createEmptyCard(now);
                // We must create the document too
                sr = new SpacedRepetition({
                    userId,
                    questionId,
                    state: 'new', // Legacy sync
                    createdAt: now,
                    // FSRS defaults
                    stability: 0,
                    difficulty: 0,
                    elapsedDays: 0,
                    scheduledDays: 0,
                    lapses: 0,
                    repetitions: 0
                });
            } else {
                // Reconstruct Card from DB
                // Map legacy state string to FSRS State Enum if needed, or rely on stored values
                // If FSRS fields are 0 (never used), FSRS will treat as New or handle gracefully if we set State correctly.
                
                let state = State.New;
                if (sr.state === 'learning' || sr.state === 'relearning') state = State.Learning;
                if (sr.state === 'review') state = State.Review;
                
                // If we have strict FSRS state stored in DB (as number) we could use that, 
                // but for now we map string -> enum to be safe with hybrid data.
                
                card = createEmptyCard(now); // Start with default
                card.due = sr.nextReviewAt;
                if (sr.lastReviewedAt) {
                    card.last_review = sr.lastReviewedAt;
                }
                card.reps = sr.repetitions;
                card.stability = sr.stability || 0;
                card.difficulty = sr.difficulty || 0;
                card.elapsed_days = sr.elapsedDays || 0;
                card.scheduled_days = sr.scheduledDays || 0;
                card.lapses = sr.lapses || 0;
                card.state = state;
            }

            // 2. Map Rating
            let fsrsRating = Rating.Good;
            switch(rating) {
                case 'Again': fsrsRating = Rating.Again; break;
                case 'Hard': fsrsRating = Rating.Hard; break;
                case 'Good': fsrsRating = Rating.Good; break;
                case 'Easy': fsrsRating = Rating.Easy; break;
            }

            // 3. Schedule
            // If the card is incorrectly marked as 'New' in DB but has history, `repeat` handles it?
            // FSRS expects `repeat` to be called with the card and the review time
            const schedulingCards = fsrs.repeat(card, now);
            
            // schedulingCards[rating] gives the specific result RecordLogItem
            // We want the new Card state from it.
            const resultRecord = schedulingCards[fsrsRating];
            const newCard = resultRecord.card;

            // 4. Update DB
            sr.nextReviewAt = newCard.due;
            sr.lastReviewedAt = newCard.last_review || now; // If undefined, fallback or keep? Usually has value after review.
            sr.repetitions = newCard.reps;
            sr.stability = newCard.stability;
            sr.difficulty = newCard.difficulty;
            sr.elapsedDays = newCard.elapsed_days;
            sr.scheduledDays = newCard.scheduled_days;
            sr.lapses = newCard.lapses;
            
            // Sync Legacy State String
            switch(newCard.state) {
                case State.New: sr.state = 'new'; break;
                case State.Learning: sr.state = 'learning'; break;
                case State.Review: sr.state = 'review'; break;
                case State.Relearning: sr.state = 'relearning'; break;
            }

            await sr.save();

            res.status(200).json(sr);
        } catch (error) {
            console.error('Review Submit Error:', error);
            res.status(500).json({ message: 'Failed to submit review' });
        }
    }
}
