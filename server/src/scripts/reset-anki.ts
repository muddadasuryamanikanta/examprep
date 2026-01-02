import mongoose from 'mongoose';
import SpacedRepetition from '../models/Anki.js';
import User from '../models/User.js';

// Helper to connect
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function reset() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const result = await SpacedRepetition.deleteMany({});
    console.log(`Deleted ${result.deletedCount} reviews.`);

    process.exit(0);
}

reset().catch(err => {
    console.error(err);
    process.exit(1);
});
