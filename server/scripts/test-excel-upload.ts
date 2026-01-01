import ExcelJS from 'exceljs';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Env setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';
const API_URL = 'http://127.0.0.1:5001/api';

async function runTest() {
    let connection;
    try {
        // 1. Get a Topic ID
        connection = await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB connection failed');

        const topic = await db.collection('topics').findOne({});
        if (!topic) {
            console.error('No topics found in DB. Please seed data first.');
            process.exit(1);
        }
        const topicId = topic._id.toString();
        console.log(`Using Topic ID: ${topicId}`);

        // 2. Create Excel File
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Template');

        // Headers (Uppercase as per recent change)
        sheet.addRow(['TYPE', 'QUESTION', 'OPTION 1', 'OPTION 2', 'OPTION 3', 'OPTION 4', 'CORRECT OPTION', 'EXPLANATION', 'HINT', 'COMPLEXITY', 'TAGS']);

        // Add Fill in the Blank Row
        // Type: fill_in_the_blank
        // Question: The capital of France is ____.
        // Correct Option: Paris (For FITB, this column holds the answer)
        sheet.addRow([
            'fill_in_the_blank',
            'The capital of France is ____.',
            '', '', '', '', // Options empty
            'Paris',        // Answer
            'Paris is the capital.',
            'It starts with P',
            '1',
            'geography,easy'
        ]);

        // Add MCQ Row for good measure
        sheet.addRow([
            'single_select_mcq',
            'What is 2+2?',
            '3', '4', '5', '6',
            '2', // Option 2 is correct (1-indexed or text? Controller logic says 1-indexed for MCQ if number, or text match. Let's use '2')
            // Wait, controller logic for MCQ: 
            // const correctOptionIndex = parseInt(row[6] as string) - 1; 
            // So '2' means Option 2.
            'Math basic',
            'Count fingers',
            '1',
            'math'
        ]);

        const fileName = 'test_upload.xlsx';
        await workbook.xlsx.writeFile(fileName);
        console.log(`Created ${fileName}`);

        // 3. Upload File
        const form = new FormData();
        form.append('file', fs.createReadStream(fileName));

        // Only needed if auth is enabled and strict. Assuming dev env might allow or we need token.
        // The previous modal code tried to use a token. 
        // If the route is protected, we need a token.
        // Let's try to get a user token if needed, or check if we can bypass for local test.
        // For now, let's try without token, if 401, we will handle.
        // Content Routes: router.post('/:topicId/import', upload.single('file'), importContent);
        // It seems it MIGHT be protected by `authenticate` middleware if applied globally or on parent route.
        // `app.use('/api/topics', authenticate, contentRoutes);` -> likely.

        // Let's grab a user and gen token if possible, or just mock it if we are running locally? 
        // No, verifying properly means using the API. 
        // Let's try to login first? Or just generate a token using jsonwebtoken if we have the secret.

        // Quick hack: Use a known test user credentials if 'seed' script created them.
        // reliable-user@example.com / password123 (Standard seed?)
        // Let's assume we need a token.

        // Alternative: The user wants me to "resolve all error".
        // I'll try to just upload. If it fails, I will fix the test script.

        console.log('Uploading...');
        const headers = {
            ...form.getHeaders()
        };

        // Attempt upload
        const res = await axios.post(`${API_URL}/topics/${topicId}/import`, form, { headers });
        console.log('Upload Response:', res.status, res.data);

        // 4. Verify DB
        const blocks = await db.collection('contentblocks').find({ topicId: new mongoose.Types.ObjectId(topicId) }).toArray();
        const fitb = blocks.find(b => b.kind === 'fill_in_the_blank' && b.question.includes('France'));

        if (fitb) {
            console.log('SUCCESS: Verified Fill in the Blank block created:', fitb);
            if (fitb.blankAnswers && fitb.blankAnswers[0] === 'Paris') {
                console.log('SUCCESS: Answer correctly parsed.');
            } else {
                console.error('FAILURE: Answer not parsed correctly.', fitb);
            }
        } else {
            console.error('FAILURE: Block not found in DB.');
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios Error:', error.response?.status, error.response?.data);
        } else {
            console.error('Error:', error);
        }
    } finally {
        if (connection) await mongoose.disconnect();
        // cleanup
        if (fs.existsSync('test_upload.xlsx')) fs.unlinkSync('test_upload.xlsx');
    }
}

runTest();
