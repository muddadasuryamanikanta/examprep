
import mongoose from 'mongoose';
import SpacedRepetition from '@/models/Anki.ts'; // Explicit extension for tsx
import { AnkiController } from '@/controllers/anki.controller.ts';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();

// Mock Mongoose setup/teardown if running against real DB or purely mock
// For this script, we can mock the request/response and Mongoose model find/save

const mockReq = (body: any, user: any) => ({
    body,
    user,
} as Request);

const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.data = data;
        return res;
    };
    return res as Response;
};

async function runTest() {
    console.log("Starting FSRS Logic Verification...");
    
    // Connect to DB - Use a local test DB to avoid messing up prod/dev
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/examprep-test";
    await mongoose.connect(MONGO_URI);
    
    try {
        const userId = new mongoose.Types.ObjectId();
        const questionId = new mongoose.Types.ObjectId();

        console.log(`Test User: ${userId}, Question: ${questionId}`);

        // Clean up
        await SpacedRepetition.deleteMany({ userId, questionId });

        // 1. New Card Review (Good)
        console.log("\n--- Test 1: New Card -> Good ---");
        const req1 = mockReq({ questionId: questionId.toString(), rating: 'Good' }, { _id: userId });
        const res1 = mockRes();
        
        await AnkiController.submitReview(req1, res1);
        
        const card1 = (res1 as any).data;
        console.log("Result 1:", {
            state: card1.state,
            nextReviewAt: card1.nextReviewAt,
            stability: card1.stability,
            difficulty: card1.difficulty
        });

        if (card1.state === 'learning' || card1.state === 'review') {
             console.log("✅ State transition correct (New -> Learning/Review depending on params)");
        } else {
             console.error("❌ Unexpected state:", card1.state);
        }

        // 2. Review Again (Good) after some time
        console.log("\n--- Test 2: Second Review -> Good ---");
        // Simulate time passing if needed, but FSRS handles short intervals too.
        // We just hit it again.
        const req2 = mockReq({ questionId: questionId.toString(), rating: 'Good' }, { _id: userId });
        const res2 = mockRes();
        
        await AnkiController.submitReview(req2, res2);
        
        const card2 = (res2 as any).data;
        console.log("Result 2:", {
            state: card2.state,
            nextReviewAt: card2.nextReviewAt,
            stability: card2.stability,
            intervalDays: card2.intervalDays // FSRS updates this? Our controller maps it?
            // Note: Our controller updates 'intervalDays' implicitly via 'scheduled_days' if mapped, 
            // but mapped fields were: stability, difficulty, elapsedDays, scheduledDays, lapses.
            // Let's check `scheduledDays`
        });
        
         if (card2.stability > card1.stability) {
             console.log("✅ Stability increased");
        } else {
             console.log("⚠️ Stability did not increase (might be expected for Learning steps)");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
