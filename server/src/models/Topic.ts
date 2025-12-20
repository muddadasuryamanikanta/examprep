import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  title: string;
  subjectId: mongoose.Types.ObjectId;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema: Schema = new Schema({
  title: { type: String, required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  position: { type: Number, default: 0 },
}, { timestamps: true });

TopicSchema.index({ subjectId: 1 });

export default mongoose.model<ITopic>('Topic', TopicSchema);
