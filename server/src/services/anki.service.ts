import SpacedRepetition from '../models/Anki.js';

class AnkiService {
  /**
   * Process a review for a question and update its SpacedRepetition status.
   * @param userId User ID
   * @param questionId Question ID (blockId)
   * @param rating 'Again' | 'Hard' | 'Good' | 'Easy'
   */
  static async processReview(userId: string, questionId: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy') {
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

    switch (sr.state) {
      case 'new':
      case 'learning':
        // --- LEARNING PHASE ---
        switch (rating) {
          case 'Again':
            sr.state = 'learning';
            sr.intervalDays = STEP_1;
            sr.repetitions = 0;
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
            sr.repetitions = 0;
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
          sr.nextReviewAt = new Date(now.getTime() + sr.intervalDays * 24 * 60 * 60 * 1000);
        }
        break;

      case 'relearning':
        // --- RELEARNING PHASE ---
        switch (rating) {
          case 'Again':
            sr.intervalDays = STEP_1; // 1m
            break;
          case 'Good':
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
    return sr;
  }
}

export default AnkiService;
