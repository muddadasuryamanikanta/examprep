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
            const updatedItem = await AnkiService.submitReview(currentItem.questionId._id, rating);
            
            // 2. Logic for Queue - FSRS Aware
            const nextQueue = [...queue];
            
            // Check if we should re-queue in this session
            // Criteria: 
            // - It's "Again" (always re-queue for short term)
            // - OR it's in Learning/Relearning state AND due very soon (e.g. < 20 mins)
            
            const now = Date.now();
            const nextReview = updatedItem.nextReviewAt ? new Date(updatedItem.nextReviewAt).getTime() : 0;
            const diffMins = (nextReview - now) / 60000;
            
            // FSRS States: 0=New, 1=Learning, 2=Review, 3=Relearning
            // We re-queue if it's due within the "Learn Ahead" window (e.g. 20 mins)
            // This covers "Again" (usually 1m) and next learning steps (e.g. 10m)
            
            if (updatedItem.nextReviewAt && diffMins <= 20) {
                // Determine insertion point roughly based on due time
                // Simple: if < 1 min, insert near front (offset 1-2)
                // if > 1 min (e.g. 10m), insert further back or append
                
                const showAfter = nextReview; // Absolute time
                
                const itemToRequeue = {
                    ...currentItem, // Keep original data (question, etc)
                    ...updatedItem, // Update stats
                    isRetry: true,
                    showAfter
                };

                // Remove the current item from head (it will be shifted by setCurrentIndex below effectively? No, we handle index.)
                // Actually we just append/splice.
                // Current item is at currentIndex. We are moving past it.
                // So we insert into nextQueue which ALREADY contains currentItem at currentIndex.
                // WE SHOULD NOT MODIFY index or removed items yet.
                // Ideally, we move currentIndex forward. Re-queued item appears LATER.
                
                if (diffMins <= 1.5) {
                    // Insert shortly after
                    const reinsertOffset = 3;
                    const insertIndex = Math.min(nextQueue.length, currentIndex + 1 + reinsertOffset);
                    nextQueue.splice(insertIndex, 0, itemToRequeue);
                } else {
                    // Append to end (or simple queue logic)
                    // If queue is huge, appending might be too late? 
                    // But usually session is limited (20 items). Appending is fine.
                    nextQueue.push(itemToRequeue);
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
