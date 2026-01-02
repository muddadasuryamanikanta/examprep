import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';

interface UseTakeTestParams {
    spaceId: string;
    subjectId: string;
    topicId?: string; // If provided, tests this specific topic. If not, tests the whole subject (not the focus for this specific task but good for flexibility)
    mode?: 'pending' | 'all'; // pending = onlyDue: true
}

export function useTakeTest() {
    const navigate = useNavigate();
    const { createTest } = useTestStore();
    const [isLoading, setIsLoading] = useState(false);

    const startTest = async ({ spaceId, subjectId, topicId, mode = 'pending' }: UseTakeTestParams) => {
        setIsLoading(true);
        try {
            // Construct Selections Payload
            const subjectsSelection = [{
                subjectId,
                allTopics: !topicId, // If no topicId, include all topics in subject
                topics: topicId ? [topicId] : []
            }];

            const selections = [{
                spaceId,
                subjects: subjectsSelection
            }];

            const payload = {
                selections,
                questionCount: 15, // Defaulting to 15 as per TopicList
                duration: 30,      // Defaulting to 30 as per TopicList
                marksPerQuestion: 1,
                negativeMarks: 0.25,
                onlyDue: mode === 'pending',
                questionTypes: ['single_select_mcq', 'multi_select_mcq']
            };

            const newTest = await createTest(payload);
            navigate(`/tests/${newTest._id}`);
            return newTest;
        } catch (error) {
            console.error("Failed to create test", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return { startTest, isLoading };
}
