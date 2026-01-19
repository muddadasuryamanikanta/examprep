import { useState, useEffect, useCallback } from 'react';
import { AnkiService } from '../services/AnkiService';
import type { AnkiSessionItem, AnkiRating } from '../services/AnkiService';


interface UseAnkiSessionProps {
    spaceId?: string;
    subjectId?: string;
    topicId?: string;
}

export function useAnkiSession({ spaceId, subjectId, topicId }: UseAnkiSessionProps) {
    const [queue, setQueue] = useState<AnkiSessionItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [sessionStats, setSessionStats] = useState({
        totalReview: 0,
        totalNew: 0,
        reviewedCount: 0,
        total: 0 // Global total
    });

    const fetchSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await AnkiService.getSession({ spaceId, subjectId, topicId, limit: 20 });
            // Handle both old array format (safety) and new object format
            const items = Array.isArray(data) ? data : data.items;
            const total = Array.isArray(data) ? data.length : data.total;

            setQueue(items);
            setSessionStats({
                totalReview: items.filter((i: AnkiSessionItem) => !i.isNew).length,
                totalNew: items.filter((i: AnkiSessionItem) => i.isNew).length,
                reviewedCount: 0,
                total: total
            });
            setCurrentIndex(0);
        } catch (err) {
            console.error(err);
            setError('Failed to load session');
        } finally {
            setIsLoading(false);
        }
    }, [spaceId, subjectId, topicId]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const currentItem = queue[currentIndex];

    const handleRating = async (rating: AnkiRating) => {
        if (!currentItem || !currentItem.questionId?._id) return; // check types

        try {
            // 1. Submit to backend
            await AnkiService.submitReview(currentItem.questionId._id, rating);

            // 2. Logic for Queue
            let nextQueue = [...queue];

            if (rating === 'Again') {
                // "Again" (1m): Re-insert shortly
                const reinsertOffset = 3;
                const insertIndex = Math.min(nextQueue.length, currentIndex + 1 + reinsertOffset);
                const retryItem = {
                    ...currentItem,
                    isRetry: true,
                    showAfter: Date.now() + 60 * 1000 // 1 minute from now
                };
                nextQueue.splice(insertIndex, 0, retryItem);
            } else if (rating === 'Hard' && currentItem.repetitions === 0) {
                // "Hard" (10m): Re-queue at end
                const learningItem = {
                    ...currentItem,
                    isRetry: true,
                    showAfter: Date.now() + 10 * 60 * 1000 // 10 minutes from now 
                };
                nextQueue.push(learningItem);
            } else if (rating === 'Good' && currentItem.repetitions === 0) {
                // "Good": Check if moving to next learning step (10m)
                // If interval < 10m (approx), it stays in learning (10m step)
                const TEN_MIN = 10 / (24 * 60);
                if (currentItem.intervalDays < TEN_MIN - 0.0001) {
                    const learningItem = {
                        ...currentItem,
                        intervalDays: TEN_MIN, // Update step locally to avoid infinite loop
                        isRetry: true,
                        showAfter: Date.now() + 10 * 60 * 1000 // 10 minutes
                    };
                    nextQueue.push(learningItem);
                }
            }

            setQueue(nextQueue);

            // Move to next
            setCurrentIndex(prev => prev + 1);
            setSessionStats(prev => ({
                ...prev,
                reviewedCount: prev.reviewedCount + 1
            }));

        } catch (err) {
            console.error('Failed to submit review', err);
        }
    };

    const isFinished = currentIndex >= queue.length && queue.length > 0;

    return {
        currentItem,
        queueLength: queue.length,
        currentIndex,
        isLoading,
        error,
        isFinished,
        handleRating,
        refresh: fetchSession,
        stats: sessionStats
    };
}
