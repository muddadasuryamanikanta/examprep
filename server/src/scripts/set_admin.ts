
import mongoose from 'mongoose';
import User from '../models/User.ts';
import { ENV } from '../config/env.ts';

async function migrate() {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Set the specific user as Admin and Approved
    const adminUpdate = await User.updateOne(
      { email: ENV.ADMIN_EMAIL },
      { $set: { role: 'admin', isApproved: true } }
    );
    console.log(`Admin update result:`, adminUpdate);

    if (adminUpdate.matchedCount === 0) {
      console.error(`WARNING: User with email ${ENV.ADMIN_EMAIL} not found!`);
    } else {
        console.log(`Successfully promoted ${ENV.ADMIN_EMAIL} to Admin.`);
    }

    // 2. Set all OTHER users as User and Unapproved
    const othersUpdate = await User.updateMany(
      { email: { $ne: ENV.ADMIN_EMAIL } },
      { $set: { role: 'user', isApproved: false } }
    );
    console.log(`Others update result:`, othersUpdate);
    console.log(`Reset ${othersUpdate.modifiedCount} other users to pending status.`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }
}

migrate();
