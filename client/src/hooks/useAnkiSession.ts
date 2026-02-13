import { useState, useEffect, useCallback, useRef } from 'react';
import { AnkiService } from '@/services/AnkiService';
import type { AnkiSessionItem, AnkiRating } from '@/services/AnkiService';


interface UseAnkiSessionProps {
    spaceId?: string;
    subjectId?: string;
    topicId?: string;
}

// ─── Constants ───
const LEARN_AHEAD_LIMIT_MINS = 20;

// ─── Heap Helpers (MinHeap by dueTime) ───
function heapInsert(heap: AnkiSessionItem[], item: AnkiSessionItem): AnkiSessionItem[] {
    const dueTime = item.showAfter || 0;
    const next = [...heap];
    let insertIdx = next.length;
    for (let i = 0; i < next.length; i++) {
        if (dueTime < (next[i].showAfter || 0)) {
            insertIdx = i;
            break;
        }
    }
    next.splice(insertIdx, 0, item);
    return next;
}

// ─── Stats Helpers ───
// In real Anki:
//   blue  = NEW cards remaining (including current if current is new)
//   red   = LEARNING cards remaining (in queue + heap + current if learning)
//   green = REVIEW cards remaining (including current if review)
// Counters decrement AFTER you answer, not when the card is shown.
function computeStats(
    nQueue: AnkiSessionItem[],
    rQueue: AnkiSessionItem[],
    lQueue: AnkiSessionItem[],
    heap: AnkiSessionItem[],
    currentCard: AnkiSessionItem | null,
    answeredCount: number
) {
    let newCount = nQueue.length;
    let learningCount = lQueue.length + heap.length;
    let reviewCount = rQueue.length;

    // Current card counts in its type (Anki shows it in the counter until answered)
    if (currentCard) {
        const ct = currentCard.cardType;
        if (ct === 'learning') learningCount++;
        else if (ct === 'review') reviewCount++;
        else newCount++; // 'new' or undefined
    }

    return { newCount, learningCount, reviewCount, reviewedCount: answeredCount };
}

export function useAnkiSession({ spaceId, subjectId, topicId }: UseAnkiSessionProps) {
    // ─── Three Separate Queues ───
    const [newQueue, setNewQueue] = useState<AnkiSessionItem[]>([]);
    const [reviewQueue, setReviewQueue] = useState<AnkiSessionItem[]>([]);
    const [learningQueue, setLearningQueue] = useState<AnkiSessionItem[]>([]);

    // Learning cards with future due times (sorted by due ascending)
    const [learningDueHeap, setLearningDueHeap] = useState<AnkiSessionItem[]>([]);

    // The card currently being shown
    const [currentItem, setCurrentItem] = useState<AnkiSessionItem | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);

    // Single source of truth for how many cards have been answered
    const answeredRef = useRef(0);

    // Timer for waiting learning cards
    const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [sessionStats, setSessionStats] = useState({
        totalReview: 0,
        totalNew: 0,
        reviewedCount: 0,
        total: 0,
        newCount: 0,
        learningCount: 0,
        reviewCount: 0
    });

    const [activePreset, setActivePreset] = useState<{
        id: string;
        name: string;
        description?: string;
    } | undefined>(undefined);

    // ─── Core: Get Next Card (Priority Rule) ───
    // 1. Move due learning cards from heap → learningQueue
    // 2. learningQueue > reviewQueue > newQueue
    // 3. If only heap has cards → immediate reappearance (§6)
    // State for mixing logic (2 Reviews : 1 New)
    const [reviewsSinceNew, setReviewsSinceNew] = useState(0);

    // ─── Core: Get Next Card (Priority Rule) ───
    // 1. Move due learning cards from heap → learningQueue
    // 2. learningQueue (IMMEDIATE PRIORITY)
    // 3. Mix reviewQueue and newQueue (2:1 ratio)
    // 4. If only heap has cards → immediate reappearance (§6)
    const getNextCard = useCallback((
        lQueue: AnkiSessionItem[],
        rQueue: AnkiSessionItem[],
        nQueue: AnkiSessionItem[],
        heap: AnkiSessionItem[]
    ): {
        card: AnkiSessionItem | null;
        lQueue: AnkiSessionItem[];
        rQueue: AnkiSessionItem[];
        nQueue: AnkiSessionItem[];
        heap: AnkiSessionItem[];
        finished: boolean;
    } => {
        // Step 1: Move due items from heap → learningQueue
        const now = Date.now();
        const updatedHeap = [...heap];
        const updatedLQueue = [...lQueue];

        while (updatedHeap.length > 0) {
            const top = updatedHeap[0];
            if (top.showAfter && top.showAfter <= now) {
                updatedLQueue.push(updatedHeap.shift()!);
            } else {
                break; // sorted, so rest are also not due
            }
        }

        // Step 2: STRICT Priority — Learning Queue
        if (updatedLQueue.length > 0) {
            const card = updatedLQueue.shift()!;
            return { card, lQueue: updatedLQueue, rQueue: [...rQueue], nQueue: [...nQueue], heap: updatedHeap, finished: false };
        }

        // Step 3: Mixed Selection — Review vs New
        // Ratio: 2 Reviews : 1 New (Anki standard-ish mix)
        let nextCard: AnkiSessionItem | null = null;
        let nextRQueue = [...rQueue];
        let nextNQueue = [...nQueue];

        // Try to respect ratio if both queues have cards
        if (nextRQueue.length > 0 && nextNQueue.length > 0) {
            if (reviewsSinceNew < 2) {
                // Show Review
                nextCard = nextRQueue.shift()!;
                setReviewsSinceNew(prev => prev + 1);
            } else {
                // Show New
                nextCard = nextNQueue.shift()!;
                setReviewsSinceNew(0);
            }
        } 
        // Fallback: If one queue is empty, just take from the other
        else if (nextRQueue.length > 0) {
            nextCard = nextRQueue.shift()!;
        } 
        else if (nextNQueue.length > 0) {
            nextCard = nextNQueue.shift()!;
        }

        if (nextCard) {
            return { 
                card: nextCard, 
                lQueue: updatedLQueue, 
                rQueue: nextRQueue, 
                nQueue: nextNQueue, 
                heap: updatedHeap, 
                finished: false 
            };
        }

        // Step 4: All queues empty — check heap (§6 Immediate Reappearance)
        if (updatedHeap.length > 0) {
            const card = updatedHeap.shift()!;
            return { card, lQueue: updatedLQueue, rQueue: [...rQueue], nQueue: [...nQueue], heap: updatedHeap, finished: false };
        }

        // Nothing left
        return { card: null, lQueue: [], rQueue: [], nQueue: [], heap: [], finished: true };
    }, [reviewsSinceNew]); // Dependency on state for mixing

    // ─── Update all state from getNextCard result ───
    const applyResult = useCallback((
        result: ReturnType<typeof getNextCard>,
        answered: number
    ) => {
        setLearningQueue(result.lQueue);
        setReviewQueue(result.rQueue);
        setNewQueue(result.nQueue);
        setLearningDueHeap(result.heap);
        setCurrentItem(result.card);

        if (result.finished) {
            setIsFinished(true);
        }

        // Compute stats with current card included (Anki behavior)
        const stats = computeStats(
            result.nQueue, result.rQueue, result.lQueue, result.heap,
            result.card, answered
        );

        setSessionStats(prev => ({
            ...prev,
            ...stats
        }));
    }, []);

    // ─── Fetch Session ───
    const fetchSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setIsFinished(false);
        try {
            const data = await AnkiService.getSession({ spaceId, subjectId, topicId, limit: 50 });

            setActivePreset(data.preset || undefined);

            // Use arrays directly from backend (already separated)
            const learning = data.learningItems || [];
            const review = data.reviewItems || [];
            const newCards = data.newItems || [];

            // Reset answered count
            answeredRef.current = 0;

            // Set initial totals (these don't change during session)
            setSessionStats(prev => ({
                ...prev,
                totalReview: review.length,
                totalNew: newCards.length,
                total: data.total
            }));

            // Get first card using priority rule & set all state
            const result = getNextCard(learning, review, newCards, []);
            applyResult(result, 0);

        } catch (err) {
            console.error(err);
            setError('Failed to load session');
        } finally {
            setIsLoading(false);
        }
    }, [spaceId, subjectId, topicId, getNextCard, applyResult]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
        };
    }, []);

    // ─── Handle Rating ───
    const handleRating = async (rating: AnkiRating) => {
        if (!currentItem || !currentItem.questionId?._id) return;

        try {
            // 1. Submit to backend
            const updatedItem = await AnkiService.submitReview(currentItem.questionId._id, rating);

            // 2. Increment answered count
            answeredRef.current += 1;

            // 3. Determine if card should be re-queued
            const now = Date.now();
            const nextReview = updatedItem.nextReviewAt ? new Date(updatedItem.nextReviewAt).getTime() : 0;
            const diffMins = (nextReview - now) / 60000;

            // Current queue state (copy)
            const nextLQueue = [...learningQueue];
            const nextRQueue = [...reviewQueue];
            const nextNQueue = [...newQueue];
            let nextHeap = [...learningDueHeap];

            if (updatedItem.nextReviewAt && diffMins > 0 && diffMins <= LEARN_AHEAD_LIMIT_MINS) {
                // ─── Learning card reinsertion ───
                // Card goes ONLY into learningDueHeap with a future showAfter

                let newCardType: 'new' | 'learning' | 'review' = 'learning';
                if (updatedItem.state === 'review' || updatedItem.state === 2) {
                    newCardType = 'review';
                }

                const itemToRequeue: AnkiSessionItem = {
                    ...updatedItem,
                    questionId: currentItem.questionId, // Keep populated question
                    isRetry: true,
                    isNew: false,
                    cardType: newCardType,
                    showAfter: nextReview,
                    nextIntervals: updatedItem.nextIntervals || currentItem.nextIntervals
                };

                nextHeap = heapInsert(nextHeap, itemToRequeue);
            }
            // If interval > 20 min or ≤ 0, card does NOT re-queue this session

            // 4. Advance to next card
            const result = getNextCard(nextLQueue, nextRQueue, nextNQueue, nextHeap);
            applyResult(result, answeredRef.current);

        } catch (err) {
            console.error('Failed to submit review', err);
        }
    };

    // ─── Return values ───
    // questionsLeft = all remaining (queues + heap + current card being shown)
    // In Anki, the card you're looking at is still "remaining" until you answer it
    const questionsRemaining = newQueue.length + reviewQueue.length + learningQueue.length + learningDueHeap.length + (currentItem ? 1 : 0);

    return {
        currentItem,
        queueLength: questionsRemaining,
        currentIndex: answeredRef.current,
        isLoading,
        error,
        isFinished,
        handleRating,
        refresh: fetchSession,
        stats: sessionStats,
        activePreset
    };
}
