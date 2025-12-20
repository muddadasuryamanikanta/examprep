import mongoose, { Schema, Document } from 'mongoose';

export interface IContentBlock extends Document {
  topicId: mongoose.Types.ObjectId;
  position: number;
  kind: 'note' | 'mcq' | 'descriptive' | 'generic';
  content?: string; // For note
  question?: string; // For mcq/descriptive
  answer?: string; // For descriptive
  options?: Array<{ id: string; text: string; isCorrect: boolean }>; // For mcq
  data?: Record<string, unknown>; // For generic
  createdAt: Date;
  updatedAt: Date;
}

const ContentBlockSchema: Schema = new Schema({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  position: { type: Number, default: 0 },
  kind: { 
    type: String, 
    required: true, 
    enum: ['note', 'mcq', 'descriptive', 'generic'] 
  },
  // Type-specific fields (sparse to save space/clarity, or we could use discriminators but single collection is easier for ordering)
  content: { type: String }, // For Note
  question: { type: String }, // For MCQ/Descriptive
  answer: { type: String }, // For Descriptive
  options: [{
    _id: false, // Don't need separate ID for subdocs if we handle ID manually or just don't care
    id: String,
    text: String,
    isCorrect: Boolean
  }],
  data: { type: Schema.Types.Mixed }, // For Generic
}, { timestamps: true });

ContentBlockSchema.index({ topicId: 1 });

export default mongoose.model<IContentBlock>('ContentBlock', ContentBlockSchema);
