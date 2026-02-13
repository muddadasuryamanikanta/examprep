import mongoose, { Schema, Document } from 'mongoose';

export interface IFSRSPreset extends Document {
  name: string;
  description?: string;
  
  // Ownership
  userId: mongoose.Types.ObjectId;
  isDefault: boolean;  // User's default preset
  isGlobal?: boolean;  // System-wide default (admin only)
  
  // FSRS Parameters (17 weights)
  w: number[];  // [w1, w2, ..., w17]
  
  // Configuration Options
  requestRetention: number;       // 0.0-1.0 (e.g., 0.9 = 90%)
  maximumInterval: number;        // Days (default: 36500)
  enableFuzz: boolean;            // Interval randomization
  enableShortTerm: boolean;       // Short-term scheduling
  
  // Learning Steps (minutes, all < 1440)
  learningSteps: number[];        // e.g., [1, 10]
  relearningSteps: number[];      // e.g., [10]
  graduatingInterval: number;     // Days (default: 1)
  easyInterval: number;           // Days (default: 4)
  
  // Meta
  createdAt: Date;
  updatedAt: Date;
  lastOptimizedAt?: Date;         // When optimizer last ran
  optimizationSource?: 'manual' | 'optimizer' | 'default';
}

const FSRSPresetSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  isDefault: { type: Boolean, default: false },
  isGlobal: { type: Boolean, default: false },
  
  // FSRS Parameters
  w: {
    type: [Number],
    required: true,
    validate: {
      validator: (v: number[]) => v.length === 17,
      message: 'FSRS parameters must contain exactly 17 weights'
    }
  },
  
  requestRetention: { type: Number, default: 0.9, min: 0.7, max: 0.99 },
  maximumInterval: { type: Number, default: 36500, min: 1 },
  enableFuzz: { type: Boolean, default: true },
  enableShortTerm: { type: Boolean, default: true },
  
  learningSteps: {
    type: [Number],
    default: [1, 10],
    validate: {
      validator: (steps: number[]) => steps.every(s => s > 0 && s < 1440),
      message: 'All learning steps must be positive and < 1440 minutes (24 hours)'
    }
  },
  relearningSteps: { 
    type: [Number], 
    default: [10],
    validate: {
      validator: (steps: number[]) => steps.every(s => s > 0 && s < 1440),
      message: 'All relearning steps must be positive and < 1440 minutes (24 hours)'
    }
  },
  graduatingInterval: { type: Number, default: 1, min: 1 },
  easyInterval: { type: Number, default: 4, min: 1 },
  
  lastOptimizedAt: Date,
  optimizationSource: { type: String, enum: ['manual', 'optimizer', 'default'] }
}, { timestamps: true });

// Indexes
FSRSPresetSchema.index({ userId: 1, isDefault: 1 });
FSRSPresetSchema.index({ isGlobal: 1 });

// Ensure only one default per user
FSRSPresetSchema.pre('save', async function() {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset other defaults for this user
    await mongoose.model('FSRSPreset').updateMany(
      { userId: this.userId, isDefault: true, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});

export default mongoose.model<IFSRSPreset>('FSRSPreset', FSRSPresetSchema);
