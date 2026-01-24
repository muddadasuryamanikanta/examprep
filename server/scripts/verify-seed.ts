import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import ContentBlock from '@/models/ContentBlock.ts';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/examprep');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const verify = async () => {
    await connectDB();
    const count = await ContentBlock.countDocuments({ group: 'Random Seeded Questions' });
    console.log(`Total Random Seeded Questions found: ${count}`);
    process.exit(0);
};

verify();
