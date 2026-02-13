import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import SpacedRepetition from '@/models/Anki.ts';
import ContentBlock, { ContentBlockType } from '@/models/ContentBlock.ts';
import Topic from '@/models/Topic.ts';
import { createEmptyCard, FSRS, Rating, State } from 'ts-fsrs';
import type { Card } from 'ts-fsrs';
import { getFSRSParams } from '@/config/fsrs-config.ts';

// ─── Shared Helper ───
// Format milliseconds to human-readable interval label (Anki style)
function formatMs(ms: number): string {
    // Guard: NaN, Infinity, negative → show "<1m"
    if (!Number.isFinite(ms) || ms <= 0) return '<1m';

    const minutes = Math.floor(ms / 60000);
    const hours   = Math.floor(ms / 3600000);
    const days    = Math.floor(ms / 86400000);
    const months  = Math.floor(days / 30);

    if (minutes < 1)   return '<1m';
    if (minutes < 60)  return `${minutes}m`;
    if (hours < 24)    return `${hours}h`;
    if (days < 31)     return `${days}d`;
    return `${months}mo`;
}

export class AnkiController {

    static async getSession(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) throw new Error('User not found');
            const userId = user._id;
            const { spaceId, subjectId, topicId, limit = 20 } = req.query;

            const params = getFSRSParams();

            // 1. Determine Scope (Topic IDs)
            let topicIds: mongoose.Types.ObjectId[] = [];

            if (topicId) {
                topicIds = [new mongoose.Types.ObjectId(String(topicId))];
            } else if (subjectId) {
                const topics = await Topic.find({ subjectId: subjectId }).select('_id');
                topicIds = topics.map(t => t._id as mongoose.Types.ObjectId);
            } else {
                if (!spaceId) return res.status(400).json({ message: "Context required (topicId or subjectId)" });
            }

            const limitNum = Number(limit);

            const validTypes = [ContentBlockType.SINGLE_SELECT_MCQ, ContentBlockType.MULTI_SELECT_MCQ, ContentBlockType.FILL_IN_THE_BLANK];

            // 2. Get ALL candidate questions for this scope
            const candidateQuestions = await ContentBlock.find({
                topicId: { $in: topicIds },
                kind: { $in: validTypes }
            }).select('_id kind question options blankAnswers topicId explanation hints').lean();

            const candidateIds = candidateQuestions.map(c => c._id);

            // 3. Find DUE cards (Learn Ahead = 20 mins, matches real Anki default)
            const now = new Date();
            const LEARN_AHEAD_MS = 20 * 60 * 1000;
            const cutoff = new Date(now.getTime() + LEARN_AHEAD_MS);

            const dueReviews = await SpacedRepetition.find({
                userId,
                questionId: { $in: candidateIds },
                nextReviewAt: { $lte: cutoff }
            })
                .sort({ nextReviewAt: 1 })
                .populate('questionId')
                .lean();

            // 4. Find NEW cards (no SpacedRepetition record at all)
            const allUserReviewsForCandidates = await SpacedRepetition.find({
                userId,
                questionId: { $in: candidateIds }
            }).select('questionId').lean();

            const reviewedIds = new Set(allUserReviewsForCandidates.map((r: any) => r.questionId.toString()));

            const newQuestions = candidateQuestions
                .filter(q => !reviewedIds.has(q._id.toString()));

            const newItemsMapped = newQuestions.map(q => ({
                _id: null,
                userId,
                questionId: q,
                isNew: true,
                easeFactor: 2.5,
                intervalDays: 0,
                repetitions: 0,
                state: 0, // State.New
                stability: 0,
                difficulty: 0,
                elapsedDays: 0,
                scheduledDays: 0,
                learningSteps: 0,
                lapses: 0
            }));

            // 5. Card Mixing (Anki Pattern): Learning > Review > New
            const learningCards = dueReviews.filter((r: any) => r.state === 'learning' || r.state === 'relearning');
            const reviewCards = dueReviews.filter((r: any) => r.state === 'review');

            const mixedQueue: any[] = [];
            let newIndex = 0;
            let reviewIndex = 0;

            // Learning/relearning first (highest priority)
            mixedQueue.push(...learningCards);

            // Interleave review and new (2 reviews : 1 new)
            while (mixedQueue.length < limitNum && (reviewIndex < reviewCards.length || newIndex < newItemsMapped.length)) {
                if (reviewIndex < reviewCards.length) {
                    mixedQueue.push(reviewCards[reviewIndex++]);
                }
                if (reviewIndex < reviewCards.length && mixedQueue.length < limitNum) {
                    mixedQueue.push(reviewCards[reviewIndex++]);
                }
                if (newIndex < newItemsMapped.length && mixedQueue.length < limitNum) {
                    mixedQueue.push(newItemsMapped[newIndex++]);
                }
            }

            const responseItems = mixedQueue.slice(0, limitNum);

            // 6. Calculate interval previews for each item using FSRS
            const fsrs = new FSRS(params);

            const calculateAnkiIntervals = (item: any) => {
                try {
                    const card = createEmptyCard(now);

                    // CRITICAL FIX #1: For interval preview, ALWAYS set card.due = now
                    // Using past due dates can cause issues with FSRS calculations
                    card.due = now;
                    if (item.lastReviewedAt) {
                        card.last_review = new Date(item.lastReviewedAt);
                    }
                    card.reps            = item.repetitions || 0;
                    card.stability       = item.stability || 0;
                    card.difficulty      = item.difficulty || 0;
                    card.elapsed_days    = item.elapsedDays || 0;
                    card.scheduled_days  = item.scheduledDays || 0;
                    card.lapses          = item.lapses || 0;

                    // CRITICAL FIX #2: Determine state BEFORE setting learning_steps
                    const isNew        = item.isNew || !item.state || item.state === 'new' || item.state === 0;
                    const isLearning   = item.state === 'learning' || item.state === 1;
                    const isRelearning = item.state === 'relearning' || item.state === 3;
                    const isReview     = item.state === 'review' || item.state === 2;

                    // CRITICAL FIX #3: For Learning state, ensure learning_steps >= 1
                    // FSRS returns NaN if learning_steps=0 in Learning state!
                    if (isLearning || isRelearning) {
                        // If card is in learning but learning_steps is 0, fix it to 1
                        card.learning_steps = Math.max(1, item.learningSteps || 1);
                    } else {
                        card.learning_steps = item.learningSteps || 0;
                    }

                    // Set state AFTER all data is populated
                    if (isNew) {
                        card.state = State.New;
                    } else if (isLearning) {
                        card.state = State.Learning;
                    } else if (isRelearning) {
                        card.state = State.Relearning;
                    } else if (isReview) {
                        card.state = State.Review;
                    }

                    const scheduling = fsrs.repeat(card, now);

                    return {
                        Again: formatMs(scheduling[Rating.Again].card.due.getTime() - now.getTime()),
                        Hard:  formatMs(scheduling[Rating.Hard].card.due.getTime()  - now.getTime()),
                        Good:  formatMs(scheduling[Rating.Good].card.due.getTime()  - now.getTime()),
                        Easy:  formatMs(scheduling[Rating.Easy].card.due.getTime()  - now.getTime())
                    };
                } catch (err) {
                    console.warn('FSRS interval calc failed, using fallback:', err);
                    return { Again: '1m', Hard: '6m', Good: '10m', Easy: '4d' };
                }
            };

            const itemsWithIntervals = responseItems.map((item: any) => {
                const intervals = calculateAnkiIntervals(item);

                let cardType: 'new' | 'learning' | 'review' = 'new';
                if (item.state === 'review' || item.state === 2) {
                    cardType = 'review';
                } else if (item.state === 'learning' || item.state === 1 || item.state === 'relearning' || item.state === 3) {
                    cardType = 'learning';
                }

                return {
                    ...item,
                    nextIntervals: intervals,
                    cardType
                };
            });

            // 7. Calculate Total Counts for UI
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

            return res.json({
                items: itemsWithIntervals,
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
            const { questionId, rating } = req.body;

            if (!questionId || !rating) {
                return res.status(400).json({ message: 'Missing questionId or rating' });
            }

            let sr = await SpacedRepetition.findOne({ userId, questionId });
            const now = new Date();

            // 1. Initialize FSRS
            const params = getFSRSParams();
            const fsrs = new FSRS(params);

            let card: Card;

            if (!sr) {
                // New card — create SR record
                card = createEmptyCard(now);
                sr = new SpacedRepetition({
                    userId,
                    questionId,
                    state: 'new',
                    createdAt: now,
                    stability: 0,
                    difficulty: 0,
                    elapsedDays: 0,
                    scheduledDays: 0,
                    learningSteps: 0,
                    lapses: 0,
                    repetitions: 0
                });
            } else {
                // Reconstruct Card from DB
                let state = State.New;
                if (sr.state === 'learning')   state = State.Learning;
                if (sr.state === 'review')     state = State.Review;
                if (sr.state === 'relearning') state = State.Relearning;

                card = createEmptyCard(now);
                card.due             = sr.nextReviewAt;
                if (sr.lastReviewedAt) {
                    card.last_review = sr.lastReviewedAt;
                }
                card.reps            = sr.repetitions;
                card.stability       = sr.stability || 0;
                card.difficulty      = sr.difficulty || 0;
                card.elapsed_days    = sr.elapsedDays || 0;
                card.scheduled_days  = sr.scheduledDays || 0;
                card.lapses          = sr.lapses || 0;
                
                // CRITICAL FIX: For Learning/Relearning state, ensure learning_steps >= 1
                // FSRS returns NaN if learning_steps=0 in Learning state!
                if (state === State.Learning || state === State.Relearning) {
                    card.learning_steps = Math.max(1, sr.learningSteps || 1);
                } else {
                    card.learning_steps = sr.learningSteps || 0;
                }
                
                card.state           = state;
            }

            // 2. Map Rating
            let fsrsRating = Rating.Good;
            switch (rating) {
                case 'Again': fsrsRating = Rating.Again; break;
                case 'Hard':  fsrsRating = Rating.Hard;  break;
                case 'Good':  fsrsRating = Rating.Good;  break;
                case 'Easy':  fsrsRating = Rating.Easy;  break;
            }

            // 3. Schedule via FSRS
            const schedulingCards = fsrs.repeat(card, now);
            const resultRecord = schedulingCards[fsrsRating];
            const newCard = resultRecord.card;

            // 4. Update DB — use FSRS due date directly for ALL states
            // FSRS handles learning (minutes), review (days) correctly
            sr.nextReviewAt  = newCard.due;
            sr.lastReviewedAt = newCard.last_review || now;
            sr.repetitions    = newCard.reps;
            sr.stability      = newCard.stability;
            sr.difficulty     = newCard.difficulty;
            sr.elapsedDays    = newCard.elapsed_days;
            sr.scheduledDays  = newCard.scheduled_days;
            sr.learningSteps  = newCard.learning_steps;
            sr.lapses         = newCard.lapses;

            // Sync state string
            switch (newCard.state) {
                case State.New:        sr.state = 'new';        break;
                case State.Learning:   sr.state = 'learning';   break;
                case State.Review:     sr.state = 'review';     break;
                case State.Relearning: sr.state = 'relearning'; break;
            }

            await sr.save();

            // 5. Return updated record (NO preview calculation — frontend uses getSession intervals)
            res.status(200).json(sr.toObject());

        } catch (error) {
            console.error('Review Submit Error:', error);
            res.status(500).json({ message: 'Failed to submit review' });
        }
    }
}
