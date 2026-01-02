import mongoose, { Schema, Document } from 'mongoose';

export interface ISpacedRepetition extends Document {
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lastReviewedAt?: Date;
  nextReviewAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SpacedRepetitionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'ContentBlock', required: true },
    easeFactor: { type: Number, default: 2.5, min: 1.3, max: 3.0 },
    intervalDays: { type: Number, default: 0 }, // Allow fractional days (0 allowed)
    repetitions: { type: Number, default: 0, min: 0 },
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