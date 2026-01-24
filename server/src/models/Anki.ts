import mongoose, { Schema, Document } from 'mongoose';

export interface ISpacedRepetition extends Document {
    userId: mongoose.Types.ObjectId;
    questionId: mongoose.Types.ObjectId;
    state: 'new' | 'learning' | 'review' | 'relearning';
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    
    // FSRS Fields
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    lapses: number;

    lastReviewedAt?: Date;
    nextReviewAt: Date;
    createdAt: Date;
    updatedAt: Date;
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
    easeFactor: { type: Number, default: 2.5, min: 1.3, max: 3.0 }, // Keep for legacy/SM-2 compat
    intervalDays: { type: Number, default: 0 }, // Allow fractional days (0 allowed)
    repetitions: { type: Number, default: 0, min: 0 },
    
    // FSRS Fields
    stability: { type: Number, default: 0 },
    difficulty: { type: Number, default: 0 },
    elapsedDays: { type: Number, default: 0 },
    scheduledDays: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },

    lastReviewedAt: { type: Date },
    nextReviewAt: { type: Date, default: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } }
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