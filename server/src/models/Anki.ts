import mongoose, { Schema, Document } from 'mongoose';

export interface ISpacedRepetition extends Document {
    userId: mongoose.Types.ObjectId;
    questionId: mongoose.Types.ObjectId;
    state: 'new' | 'learning' | 'review' | 'relearning';
    
    /**
     * @deprecated Legacy SM-2 field, not used by FSRS. Kept for backward compatibility only.
     */
    easeFactor: number;
    
    /**
     * @deprecated Legacy SM-2 field, not used by FSRS. Kept for backward compatibility only.
     */
    intervalDays: number;
    
    repetitions: number;
    
    // FSRS Fields
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    learningSteps: number; // Tracks current step in learning/relearning sequence
    lapses: number;

    lastReviewedAt?: Date;
    nextReviewAt: Date;
    createdAt: Date;
    updatedAt: Date;
    
    // Consolidated History
    history: Array<{
        rating: number;
        state: string;
        reviewedAt: Date;
        elapsedDays: number;
        scheduledDays: number;
        stability: number;
        difficulty: number;
        reviewDuration: number;
    }>;
}

const SpacedRepetitionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'ContentBlock', required: true },
    state: { 
      type: String, 
      enum: ['new', 'learning', 'review', 'relearning'], 
      default: 'new' 
    },
    
    // Legacy SM-2 fields (not used by FSRS, kept for backward compatibility)
    easeFactor: { type: Number, default: 2.5, min: 1.3, max: 3.0 },
    intervalDays: { type: Number, default: 0 },
    
    repetitions: { type: Number, default: 0, min: 0 },
    
    // FSRS Fields
    stability: { type: Number, default: 0 },
    difficulty: { type: Number, default: 0 },
    elapsedDays: { type: Number, default: 0 },
    scheduledDays: { type: Number, default: 0 },
    learningSteps: { type: Number, default: 0 }, // Current step in learning sequence
    lapses: { type: Number, default: 0 },

    lastReviewedAt: { type: Date },
    nextReviewAt: { type: Date, default: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
    
    // NEW: Review History (Consolidated Storage)
    history: [{
        rating: { type: Number, required: true }, // 1-4
        state: { type: String, required: true },  // New/Learning/Review/Relearning
        reviewedAt: { type: Date, default: Date.now },
        elapsedDays: { type: Number, default: 0 },
        scheduledDays: { type: Number, default: 0 },
        stability: { type: Number, default: 0 },
        difficulty: { type: Number, default: 0 },
        reviewDuration: { type: Number, default: 0 }
    }]
  },
  { timestamps: true }
);

// Indexes
SpacedRepetitionSchema.index({ userId: 1, nextReviewAt: 1 });
SpacedRepetitionSchema.index({ userId: 1, questionId: 1 }, { unique: true });

export default mongoose.model<ISpacedRepetition>('SpacedRepetition', SpacedRepetitionSchema);




/*function updateReview(sr, rating) {
  const today = new Date()

  switch (rating) {
    case "Again":
      sr.repetitions = 0
      sr.intervalDays = 1
      sr.easeFactor -= 0.2
      sr.nextReviewAt = addDays(today, 1)
      break

    case "Hard":
      sr.repetitions += 1
      sr.intervalDays = Math.round(sr.intervalDays * 1.2)
      sr.easeFactor -= 0.15
      sr.nextReviewAt = addDays(today, sr.intervalDays)
      break

    case "Good":
      sr.repetitions += 1
      sr.intervalDays = Math.round(sr.intervalDays * sr.easeFactor)
      sr.nextReviewAt = addDays(today, sr.intervalDays)
      break

    case "Easy":
      sr.repetitions += 1
      sr.intervalDays = Math.round(sr.intervalDays * sr.easeFactor * 1.3)
      sr.easeFactor += 0.15
      sr.nextReviewAt = addDays(today, sr.intervalDays)
      break

    default:
      throw new Error("Invalid rating")
  }

  // HARD SAFETY CAPS (never skip this)
  sr.easeFactor = Math.min(3.0, Math.max(1.3, sr.easeFactor))
  sr.intervalDays = Math.max(1, sr.intervalDays)

  sr.lastReviewedAt = today
  sr.updatedAt = today
}
*/