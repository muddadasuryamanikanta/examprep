export interface TestUnit {
    space: {
        _id: string;
        name: string;
        slug: string;
    };
    subject: {
        _id: string;
        name: string;
        slug: string;
    };
    topic: {
        _id: string;
        name: string;
        slug: string;
    };
    dueQuestions: number;
    totalQuestions: number;
    status: 'COMPLETE' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'OVERDUE';
}
