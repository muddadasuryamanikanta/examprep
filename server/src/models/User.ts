import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  googleId?: string;
  avatar?: string;
  jwtSecureCode: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  role: 'user' | 'admin';
  isApproved: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  googleId: { type: String },
  avatar: { type: String },
  jwtSecureCode: { type: String, required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
