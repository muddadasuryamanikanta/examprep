import { useParams, useNavigate } from 'react-router-dom';
import { useAnkiSession } from '../hooks/useAnkiSession';
import { ContentBlockDisplay } from '../components/content-blocks/ContentBlockDisplay';
import { Button } from '../components/common/Button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils'; // Assuming utils
import type { AnkiRating } from '../services/AnkiService';

export default function AnkiBoard() {
    const { type, id } = useParams(); // type: 'subject' | 'topic', id: slug or ID
    // Wait, existing routing uses slugs mostly. IDs might be safer if we can resolve them.
    // Implementation Plan said: useAnkiSession accepts IDs.
    // If the URL has IDs, great. If Slugs, we need to resolve.
    // For simplicity, let's assume the router passes IDs or we'll modify the router to accept IDs for this "Recall" feature.
    // Or `useAnkiSession` can take slugs? No, backend expects IDs usually or we need to lookup.
    // Let's assume we pass IDs in the URL for now: `/recall/topic/:topicId`.

    const context = {
        topicId: type === 'topic' ? id : undefined,
        subjectId: type === 'subject' ? id : undefined
        // Space not supported in UI entry yet
    };

    const { currentItem, currentIndex, queueLength, isLoading, isFinished, handleRating, refresh, stats } = useAnkiSession(context);

    // State for interaction
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<any>(undefined); // For interaction tracking

    // --- LEARNING STEP CHECK STATE ---
    // Moved to top level to comply with React Rules of Hooks
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    // ---------------------------------

    // Reset local state when item changes
    useEffect(() => {
        setShowAnswer(false);
        setSelectedAnswer(undefined);
    }, [currentItem]);

    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Session...</span>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
                <h1 className="text-3xl font-bold mb-4">You have finished this recall session!</h1>
                <p className="text-gray-400 mb-8">Great job keeping up with your revisions.</p>
                <div className="flex gap-4">
                    <Button onClick={refresh}>Start Another Session</Button>
                    <Button variant="secondary" onClick={() => navigate(-1)}>Back to Library</Button>
                </div>
            </div>
        );
    }

    if (!currentItem) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h2 className="text-xl font-bold">No questions due!</h2>
                    <p className="text-gray-400 mt-2">Check back later or add more content.</p>
                    <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    // --- LEARNING STEP CHECK LOGIC ---
    const showAfter = currentItem?.showAfter;
    const isLocked = showAfter && showAfter > now;

    if (isLocked) {
        const remainingSeconds = Math.ceil((showAfter - now) / 1000);
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;

        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">Learning Step in Progress</h2>
                <p className="text-gray-400 mb-6">This card is waiting for its learning interval to pass.</p>
                <div className="text-4xl font-mono font-bold text-primary mb-8">
                    {mins}:{secs.toString().padStart(2, '0')}
                </div>
                {/* 
                   Ideally, we would check if there are OTHER cards to review.
                   Since our generic hook just gives us `currentItem`, we are blocked on this one.
                   In a full implementation, we would skip this card. 
                   For now, this "Waiting" screen effectively enforces the Time Factor requested.
                */}
                <Button variant="secondary" onClick={() => navigate(-1)}>Exit Session</Button>
            </div>
        );
    }
    // ---------------------------

    // Calculate Next Intervals for UI (Mock logic to match backend roughly or just static labels)
    // Calculate Next Intervals for UI (Mock logic to match backend roughly or just static labels)
    const getIntervalLabel = (rating: AnkiRating) => {
        const currentInt = currentItem.intervalDays;
        const ef = currentItem.easeFactor;
        const isNew = currentItem.repetitions === 0;

        // Helper to format days
        const fmt = (days: number) => {
            if (days < 0.9 / (24 * 60)) return '<1m'; // Less than ~0.9 mins
            if (days < 1) return `${Math.round(days * 24 * 60)}m`;
            return `${Math.round(days)}d`;
        };

        if (isNew) {
            if (rating === 'Again') return '1m';
            if (rating === 'Hard') return '10m';
            if (rating === 'Good') return '1d';
            if (rating === 'Easy') return '4d';
        }

        // Review Card
        if (rating === 'Again') return '1m'; // Re-learn
        if (rating === 'Hard') return fmt(currentInt * 1.2);
        if (rating === 'Good') return fmt(currentInt * ef);
        if (rating === 'Easy') return fmt(currentInt * ef * 1.3);

        return '?';
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
            {/* Header */}
            <div className="p-4 flex justify-between items-center text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Exit
                </Button>
                <div className="bg-secondary px-3 py-1 rounded-full text-secondary-foreground font-medium">
                    Questions Left: {Math.max(queueLength, stats?.total || 0) - currentIndex}
                </div>
                <div />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full p-6 pt-10">

                {/* Question Area */}
                <div className="w-full mb-8">
                    <ContentBlockDisplay
                        key={currentItem.questionId._id} // CRITICAL: Force remount to reset internal state (isSubmitted, etc.)
                        block={currentItem.questionId}
                        isTest={false} // Practice Mode
                        value={selectedAnswer}
                        onChange={(val) => {
                            // Logic:
                            // Single MCQ: Selecting IS the interaction. Auto-submit handled by Block -> call onSubmit.
                            // Multi/FITB: Selecting just updates state. Submit button in block calls onSubmit.
                            setSelectedAnswer(val); // Sync state for tracking if needed
                        }}
                        onSubmit={() => setShowAnswer(true)}
                    />
                </div>

                {/* Footer / Controls */}
                <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-6 z-10">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        {!showAnswer ? (
                            /* Only show Global "Show Answer" if the block doesn't have its own primary interaction (like Note) 
                               OR as a fallback? 
                               User said: "keep submit button". Multi/FITB have their own.
                               Single MCQ auto-submits.
                               So mostly we DON'T need this button for Questions, only for Notes/Flashcards?
                               But let's keep it for "Flashcard" style usage or if they want to give up?
                               No, User implied for proper questions, use the proper flow.
                               Let's hide it for Multi/FITB to force use of their Submit button.
                            */
                            currentItem.questionId.kind === 'note' ? (
                                <Button
                                    className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={() => setShowAnswer(true)}
                                >
                                    Show Answer
                                </Button>
                            ) : null
                            /* If null, user uses the Block's UI. 
                               Wait, what if they get stuck? The Block's submit button should enable. 
                               Multi requires selection. FITB requires input.
                               If they can't answer, they are stuck? 
                               Maybe add a small "Give Up / Show Answer" text button?
                               Let's stick to strict flow for now as requested.
                            */
                        ) : (
                            <div className="w-full grid grid-cols-4 gap-4">
                                <RatingButton
                                    label="Again"
                                    subLabel={getIntervalLabel('Again')}
                                    color="text-destructive"
                                    hoverBg="hover:bg-destructive/10"
                                    onClick={() => handleRating('Again')}
                                />
                                <RatingButton
                                    label="Hard"
                                    subLabel={getIntervalLabel('Hard')}
                                    color="text-warning"
                                    hoverBg="hover:bg-warning/10"
                                    onClick={() => handleRating('Hard')}
                                />
                                <RatingButton
                                    label="Good"
                                    subLabel={getIntervalLabel('Good')}
                                    color="text-success"
                                    hoverBg="hover:bg-success/10"
                                    border="border-t-4 border-success bg-secondary/50" // Highlight default
                                    onClick={() => handleRating('Good')}
                                />
                                <RatingButton
                                    label="Easy"
                                    subLabel={getIntervalLabel('Easy')}
                                    color="text-blue-500 dark:text-blue-400"
                                    hoverBg="hover:bg-blue-500/10"
                                    onClick={() => handleRating('Easy')}
                                />
                            </div>
                        )}
                    </div>
                    {/* Shortcuts hint */}
                    {showAnswer && (
                        <div className="text-center text-xs text-muted-foreground mt-2">
                            Shortcuts: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
                        </div>
                    )}
                </div>
                {/* Spacer for fixed footer */}
                <div className="h-24" />
            </div>
        </div>
    );
}

function RatingButton({ label, subLabel, color, hoverBg, onClick, border = "border border-border bg-card" }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center py-3 rounded-lg transition-all",
                border,
                hoverBg
            )}
        >
            <span className="text-xs text-muted-foreground mb-1">{subLabel}</span>
            <span className={cn("text-lg font-bold", color)}>{label}</span>
        </button>
    );
}
