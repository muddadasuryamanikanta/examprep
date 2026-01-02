import api from '../lib/api';
import type { ContentBlock } from '../types/domain';

export interface AnkiSessionItem {
    _id: string | null; // Null if new
    userId: string;
    questionId: ContentBlock; // Populated
    isNew?: boolean;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewAt?: string;
    lastReviewedAt?: string;
    // Local state for queue management
    isRetry?: boolean;
    showAfter?: number;
}

export type AnkiRating = 'Again' | 'Hard' | 'Good' | 'Easy';

export const AnkiService = {
    getSession: async (context: { spaceId?: string; subjectId?: string; topicId?: string; limit?: number }) => {
        const params = new URLSearchParams();
        if (context.spaceId) params.append('spaceId', context.spaceId);
        if (context.subjectId) params.append('subjectId', context.subjectId);
        if (context.topicId) params.append('topicId', context.topicId);
        if (context.limit) params.append('limit', context.limit.toString());

        const response = await api.get<{ items: AnkiSessionItem[], total: number }>(`/anki/session?${params.toString()}`);
        return response.data; // { items, total }
    },

    submitReview: async (questionId: string, rating: AnkiRating) => {
        const response = await api.post('/anki/review', { questionId, rating });
        return response.data;
    }
};
