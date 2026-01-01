import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function getTopicId() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Define a minimal schema if models aren't loaded, or just use raw collection
        // But since we are using tsx, we can import model if available, but let's just use raw connection for speed
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection failed');
        }
        const topic = await db.collection('topics').findOne({});

        if (topic) {
            console.log('TOPIC_ID:', topic._id.toString());
        } else {
            console.log('No topics found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

getTopicId();
