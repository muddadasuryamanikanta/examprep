import mongoose, { Schema, Document } from 'mongoose';

export interface ISpace extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SpaceSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

export default mongoose.model<ISpace>('Space', SpaceSchema);
