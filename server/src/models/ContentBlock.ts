import mongoose, { Schema, Document } from 'mongoose';

export enum ContentBlockType {
  NOTE = 'note',
  SINGLE_SELECT_MCQ = 'single_select_mcq',
  MULTI_SELECT_MCQ = 'multi_select_mcq',
  DESCRIPTIVE = 'descriptive',
  GENERIC = 'generic'
}

export interface IContentBlock extends Document {
  topicId: mongoose.Types.ObjectId;
  position: number;
  kind: ContentBlockType;
  content?: string; // For note
  question?: string; // For mcqs/descriptive
  answer?: string; // For descriptive
  explanation?: string;
  notes?: string;
  tags?: string[];
  group?: string;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>; // For mcqs
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
    enum: Object.values(ContentBlockType) 
  },
  // Type-specific fields (sparse to save space/clarity, or we could use discriminators but single collection is easier for ordering)
  content: { type: String }, // For Note
  question: { type: String }, // For MCQs/Descriptive
  answer: { type: String }, // For Descriptive
  explanation: { type: String },
  notes: { type: String }, // Additional notes for the question
  tags: [{ type: String }], // Array of strings for hashtags
  group: { type: String }, // For grouping blocks (e.g. "Section 1")
  hints: [{ type: String }], // Array of hints
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
