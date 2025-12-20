import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  title: string;
  spaceId: mongoose.Types.ObjectId;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema({
  title: { type: String, required: true },
  spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
  position: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index for efficient querying
SubjectSchema.index({ spaceId: 1 });

export default mongoose.model<ISubject>('Subject', SubjectSchema);
