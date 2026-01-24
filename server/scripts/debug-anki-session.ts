
import mongoose from 'mongoose';
import { AnkiController } from '@/controllers/anki.controller.ts';
import SpacedRepetition from '@/models/Anki.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import Topic from '@/models/Topic.ts';
import User from '@/models/User.ts';
import type { Request } from 'express';
import dotenv from 'dotenv';
dotenv.config();

const mockReq = (query: any, user: any) => ({
    query,
    user,
} as Request);

const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        console.log("Response Data Items:", data.items ? data.items.map((i: any) => ({
            _id: i._id,
            isNew: i.isNew,
            questionIdType: typeof i.questionId,
            questionIdIsObject: typeof i.questionId === 'object',
            questionIdKind: i.questionId?.kind,
            questionId: i.questionId
        })) : data);
        return res;
    };
    return res;
};

async function runDebug() {
    console.log("Starting Session Debug...");
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/examprep"; // Default to dev db
    await mongoose.connect(MONGO_URI);

    try {
        // Check ContentBlocks
        const allBlocks = await ContentBlock.find({}).lean();
        console.log(`Checking ${allBlocks.length} ContentBlocks...`);
        
        const validKinds = ['note', 'single_select_mcq', 'multi_select_mcq', 'fill_in_the_blank'];
        
        const badBlocks = allBlocks.filter((b: any) => !b.kind || !validKinds.includes(b.kind));
        
        if (badBlocks.length > 0) {
             console.log("FOUND BAD BLOCKS:", badBlocks.map((b: any) => ({
                 _id: b._id,
                 kind: b.kind,
                 topicId: b.topicId
             })));
        } else {
             console.log("All ContentBlocks have valid kinds.");
        }
        
        // Also check if any questionId is just an ID (populate failure fallback?)
        const allReviews = await SpacedRepetition.find({}).lean();
        const idOnly = allReviews.filter((r: any) => r.questionId && !r.questionId.kind && mongoose.isValidObjectId(r.questionId));
        if (idOnly.length > 0) {
             console.log("FOUND ID ONLY ITEMS:", idOnly.map((i: any) => i._id));
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

runDebug();
