/**
 * Creates test data for multi-queue Anki verification.
 * Connects directly to MongoDB — no login needed.
 * 
 * Creates: 1 Space → 1 Subject → 1 Topic → 9 Questions
 *   - 3 NEW (no SpacedRepetition record)
 *   - 3 LEARNING (state='learning', due now)
 *   - 3 REVIEW (state='review', due now)
 * 
 * Usage: node scripts/create-queue-test-data.js
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://muddadasuryamanikanta_db_user:6pCzO7hz7cxIyMcm@cluster0.hv76sas.mongodb.net/prod';
const USER_ID = '698c2874dc56fbdb462c43a5';

// ─── Schemas (inline, minimal) ───

const SpaceSchema = new mongoose.Schema({
    name: String, description: String, slug: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    icon: { type: String, default: 'Book' },
    subjectCount: { type: Number, default: 0 }
}, { timestamps: true });

const SubjectSchema = new mongoose.Schema({
    title: String, slug: String,
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
    position: { type: Number, default: 0 },
    topicCount: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    icon: { type: String, default: 'Book' }
}, { timestamps: true });

const TopicSchema = new mongoose.Schema({
    title: String, slug: String,
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    position: { type: Number, default: 0 },
    icon: { type: String, default: 'Hash' }
}, { timestamps: true });

const ContentBlockSchema = new mongoose.Schema({
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
    position: { type: Number, default: 0 },
    kind: String,
    question: String,
    explanation: String,
    blankAnswers: [String],
    hints: [String],
    options: [{ id: String, text: String, isCorrect: Boolean }]
}, { timestamps: true });

const SpacedRepetitionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentBlock' },
    state: { type: String, enum: ['new', 'learning', 'review', 'relearning'], default: 'new' },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    stability: { type: Number, default: 0 },
    difficulty: { type: Number, default: 0 },
    elapsedDays: { type: Number, default: 0 },
    scheduledDays: { type: Number, default: 0 },
    learningSteps: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
    lastReviewedAt: Date,
    nextReviewAt: Date
}, { timestamps: true });

const Space = mongoose.model('Space', SpaceSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Topic = mongoose.model('Topic', TopicSchema);
const ContentBlock = mongoose.model('ContentBlock', ContentBlockSchema);
const SpacedRepetition = mongoose.model('SpacedRepetition', SpacedRepetitionSchema);

function makeSlug(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const rand = Math.random().toString(36).substring(2, 7);
    return `${base}-${rand}`;
}

async function main() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('   ✅ Connected\n');

    const userId = new mongoose.Types.ObjectId(USER_ID);
    const now = new Date();

    // ─── Create Space ───
    console.log('📁 Creating Space...');
    const space = await Space.create({
        name: 'Queue Test Space',
        description: 'Multi-queue Anki testing',
        slug: makeSlug('Queue Test Space'),
        userId
    });
    console.log(`   ✅ Space: ${space._id}`);

    // ─── Create Subject ───
    console.log('📂 Creating Subject...');
    const subject = await Subject.create({
        title: 'Algorithms',
        slug: makeSlug('Algorithms'),
        spaceId: space._id
    });
    // Update space subject count
    await Space.updateOne({ _id: space._id }, { $inc: { subjectCount: 1 } });
    console.log(`   ✅ Subject: ${subject._id}`);

    // ─── Create Topic ───
    console.log('📄 Creating Topic...');
    const topic = await Topic.create({
        title: 'Sorting',
        slug: makeSlug('Sorting'),
        subjectId: subject._id
    });
    // Update subject topic count
    await Subject.updateOne({ _id: subject._id }, { $inc: { topicCount: 1 } });
    console.log(`   ✅ Topic: ${topic._id}`);

    // ─── Create 9 Questions ───
    console.log('\n📝 Creating 9 questions...');
    const questions = [
        // 3 NEW (indices 0-2)
        {
            kind: 'single_select_mcq',
            question: 'What is the time complexity of Bubble Sort?',
            options: [
                { id: 'a', text: 'O(n²)', isCorrect: true },
                { id: 'b', text: 'O(n log n)', isCorrect: false },
                { id: 'c', text: 'O(n)', isCorrect: false },
                { id: 'd', text: 'O(log n)', isCorrect: false }
            ],
            explanation: 'Bubble Sort has O(n²) worst and average case.'
        },
        {
            kind: 'single_select_mcq',
            question: 'Which sort is NOT stable?',
            options: [
                { id: 'a', text: 'Merge Sort', isCorrect: false },
                { id: 'b', text: 'Quick Sort', isCorrect: true },
                { id: 'c', text: 'Insertion Sort', isCorrect: false },
                { id: 'd', text: 'Bubble Sort', isCorrect: false }
            ],
            explanation: 'Quick Sort is not stable by default.'
        },
        {
            kind: 'fill_in_the_blank',
            question: 'The best-case time complexity of Insertion Sort is _____.',
            blankAnswers: ['O(n)'],
            explanation: 'When array is already sorted, Insertion Sort is O(n).'
        },
        // 3 LEARNING (indices 3-5)
        {
            kind: 'single_select_mcq',
            question: 'What is the average time complexity of Merge Sort?',
            options: [
                { id: 'a', text: 'O(n²)', isCorrect: false },
                { id: 'b', text: 'O(n log n)', isCorrect: true },
                { id: 'c', text: 'O(n)', isCorrect: false },
                { id: 'd', text: 'O(log n)', isCorrect: false }
            ],
            explanation: 'Merge Sort is O(n log n) in all cases.'
        },
        {
            kind: 'single_select_mcq',
            question: 'Which sorting algorithm uses a pivot element?',
            options: [
                { id: 'a', text: 'Merge Sort', isCorrect: false },
                { id: 'b', text: 'Quick Sort', isCorrect: true },
                { id: 'c', text: 'Heap Sort', isCorrect: false },
                { id: 'd', text: 'Radix Sort', isCorrect: false }
            ],
            explanation: 'Quick Sort partitions around a pivot.'
        },
        {
            kind: 'fill_in_the_blank',
            question: 'Heap Sort uses a _____ data structure.',
            blankAnswers: ['binary heap', 'heap'],
            explanation: 'Heap Sort builds a max-heap to sort.'
        },
        // 3 REVIEW (indices 6-8)
        {
            kind: 'single_select_mcq',
            question: 'What is the space complexity of Merge Sort?',
            options: [
                { id: 'a', text: 'O(1)', isCorrect: false },
                { id: 'b', text: 'O(n)', isCorrect: true },
                { id: 'c', text: 'O(n²)', isCorrect: false },
                { id: 'd', text: 'O(log n)', isCorrect: false }
            ],
            explanation: 'Merge Sort needs O(n) auxiliary space.'
        },
        {
            kind: 'single_select_mcq',
            question: 'Which sort is best for nearly sorted data?',
            options: [
                { id: 'a', text: 'Quick Sort', isCorrect: false },
                { id: 'b', text: 'Insertion Sort', isCorrect: true },
                { id: 'c', text: 'Heap Sort', isCorrect: false },
                { id: 'd', text: 'Selection Sort', isCorrect: false }
            ],
            explanation: 'Insertion Sort is O(n) on nearly sorted data.'
        },
        {
            kind: 'single_select_mcq',
            question: 'Counting Sort has a time complexity of:',
            options: [
                { id: 'a', text: 'O(n²)', isCorrect: false },
                { id: 'b', text: 'O(n log n)', isCorrect: false },
                { id: 'c', text: 'O(n + k)', isCorrect: true },
                { id: 'd', text: 'O(n)', isCorrect: false }
            ],
            explanation: 'Counting Sort is O(n + k) where k is the range.'
        }
    ];

    const created = [];
    for (let i = 0; i < questions.length; i++) {
        const q = await ContentBlock.create({
            ...questions[i],
            topicId: topic._id,
            position: i
        });
        created.push(q);
        console.log(`   ✅ Q${i + 1}: ${q._id} — "${questions[i].question.substring(0, 50)}..."`);
    }

    // Update subject question count
    await Subject.updateOne({ _id: subject._id }, { $inc: { questionCount: 9 } });

    // ─── Set LEARNING state for Q4-Q6 (due NOW) ───
    console.log('\n🔄 Setting LEARNING state for Q4-Q6...');
    for (let i = 3; i < 6; i++) {
        const sr = await SpacedRepetition.create({
            userId,
            questionId: created[i]._id,
            state: 'learning',
            repetitions: 1,
            stability: 0.4,
            difficulty: 5.0,
            elapsedDays: 0,
            scheduledDays: 0,
            learningSteps: 0,
            lapses: 0,
            lastReviewedAt: new Date(now.getTime() - 60000), // 1 min ago
            nextReviewAt: now // Due NOW
        });
        console.log(`   ✅ Q${i + 1}: state=${sr.state}, due=NOW`);
    }

    // ─── Set REVIEW state for Q7-Q9 (due NOW) ───
    console.log('\n📗 Setting REVIEW state for Q7-Q9...');
    for (let i = 6; i < 9; i++) {
        const sr = await SpacedRepetition.create({
            userId,
            questionId: created[i]._id,
            state: 'review',
            repetitions: 3,
            stability: 10.0,
            difficulty: 5.0,
            elapsedDays: 1,
            scheduledDays: 1,
            learningSteps: 2,
            lapses: 0,
            lastReviewedAt: new Date(now.getTime() - 86400000), // 1 day ago
            nextReviewAt: now // Due NOW
        });
        console.log(`   ✅ Q${i + 1}: state=${sr.state}, due=NOW`);
    }

    // ─── Summary ───
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST DATA CREATED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log(`  Topic ID: ${topic._id}`);
    console.log(`  URL: http://localhost:5173/recall/topic/${topic._id}`);
    console.log('');
    console.log('  NEW (3):      Q1-Q3 (no SR records)');
    console.log('  LEARNING (3): Q4-Q6 (state=learning, due=now)');
    console.log('  REVIEW (3):   Q7-Q9 (state=review, due=now)');
    console.log('═'.repeat(60));

    await mongoose.disconnect();
    console.log('\n🔗 Disconnected from MongoDB');
}

main().catch(async err => {
    console.error('❌ Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
});
