import mongoose from 'mongoose';
import Space from '../models/Space';
import Subject from '../models/Subject';
import Topic from '../models/Topic';
import ContentBlock, { ContentBlockType } from '../models/ContentBlock';
import User from '../models/User';

// Helper to connect (assuming standalone script usage, need URI)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    // 0. Find or Create User (using first found or dummy)
    let user = await User.findOne();
    if (!user) {
        console.log('No user found, creating dummy');
        user = await User.create({ name: 'Demo User', email: 'demo@example.com', password: 'password' });
    }

    // 1. Create Space
    let space = await Space.findOne({ name: 'Anki Playground' });
    if (!space) {
        space = await Space.create({ name: 'Anki Playground', slug: 'anki-playground', icon: 'Box', userId: user._id });
    }
    console.log('Space:', space.name);

    // 2. Create Subject
    let subject = await Subject.findOne({ title: 'General Knowledge', spaceId: space._id });
    if (!subject) {
        subject = await Subject.create({ title: 'General Knowledge', slug: 'general-knowledge', spaceId: space._id, icon: 'Globe' });
    }
    console.log('Subject:', subject.title);

    // 3. Create Topic
    let topic = await Topic.findOne({ title: 'Mixed Questions', subjectId: subject._id });
    if (!topic) {
        topic = await Topic.create({ title: 'Mixed Questions', slug: 'mixed-questions', subjectId: subject._id, icon: 'Hash' });
    }
    console.log('Topic:', topic.title);

    // 4. Create Questions
    // Clear existing for this topic to be clean?
    await ContentBlock.deleteMany({ topicId: topic._id });

    // Q1: Single Select MCQ (Article 324)
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.SINGLE_SELECT_MCQ,
        question: 'Which Article of the Indian Constitution deals with the superintendence, direction, and control of elections?',
        options: [
            { id: '1', text: 'Article 324', isCorrect: true },
            { id: '2', text: 'Article 356', isCorrect: false },
            { id: '3', text: 'Article 280', isCorrect: false },
            { id: '4', text: 'Article 110', isCorrect: false },
        ],
        explanation: 'Article 324 provides that the power of superintendence, direction and control of elections... shall be vested in the Election Commission.',
        hints: ['Think about the Election Commission.']
    });

    // Q2: Multi Select MCQ
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.MULTI_SELECT_MCQ,
        question: 'Which of the following are Fundamental Rights in the Indian Constitution?',
        options: [
            { id: '1', text: 'Right to Equality', isCorrect: true },
            { id: '2', text: 'Right to Property', isCorrect: false },
            { id: '3', text: 'Right to Freedom', isCorrect: true },
            { id: '4', text: 'Right to Vote', isCorrect: false }, // Constitutional but not Fundamental strictly in Part III logic context usually asked
        ],
        explanation: 'Right to Equality and Right to Freedom are Fundamental Rights. Right to Property was removed by 44th Amendment.',
        hints: ['One of these was removed.']
    });

    // Q3: Fill in the Blank
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.FILL_IN_THE_BLANK,
        question: 'The capital of ___ is ___.',
        blankAnswers: ['France', 'Paris'],
        explanation: 'Paris is the capital of France.',
        hints: ['Country in Europe', 'City of Lights']
    });

    // Q4: Fill in the Blank (Single)
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.FILL_IN_THE_BLANK,
        question: 'H2O is the chemical formula for ___.',
        blankAnswers: ['Water'],
        explanation: 'Two hydrogen atoms and one oxygen atom.',
    });

    // --- NEW QUESTIONS ---

    // Q5: Single Select MCQ (Geography)
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.SINGLE_SELECT_MCQ,
        question: 'Which is the longest river in the world?',
        options: [
            { id: '1', text: 'Nile', isCorrect: true },
            { id: '2', text: 'Amazon', isCorrect: false },
            { id: '3', text: 'Yangtze', isCorrect: false },
            { id: '4', text: 'Mississippi', isCorrect: false },
        ],
        explanation: 'The Nile is generally considered the longest river in the world, although some studies suggest the Amazon might be longer.',
        hints: ['It is located in Africa.']
    });

    // Q6: Multi Select MCQ (Technology)
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.MULTI_SELECT_MCQ,
        question: 'Which of the following are programming languages?',
        options: [
            { id: '1', text: 'Python', isCorrect: true },
            { id: '2', text: 'HTML', isCorrect: false }, // Markup language
            { id: '3', text: 'Java', isCorrect: true },
            { id: '4', text: 'HTTP', isCorrect: false }, // Protocol
        ],
        explanation: 'Python and Java are programming languages. HTML is a markup language, and HTTP is a protocol.',
        hints: ['HTML defines structure, HTTP transfers data.']
    });

    // Q7: Fill in the Blank (History)
    await ContentBlock.create({
        topicId: topic._id,
        kind: ContentBlockType.FILL_IN_THE_BLANK,
        question: 'The First World War started in the year ___ and ended in ___.',
        blankAnswers: ['1914', '1918'],
        explanation: 'WWI lasted from July 1914 to November 1918.',
        hints: ['Early 20th century.']
    });

    console.log('Seeding Complete');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
