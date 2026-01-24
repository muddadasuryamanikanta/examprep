import { useState } from 'react';
import { ContentBlockDisplay } from '../content-blocks/ContentBlockDisplay';
import { Button } from '../common/Button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AnkiRating, AnkiSessionItem } from '../../services/AnkiService';
import { createEmptyCard, FSRS, Rating, State, generatorParameters } from 'ts-fsrs';

interface AnkiCardViewProps {
    currentItem: AnkiSessionItem;
    questionsLeft: number;
    onRating: (rating: AnkiRating) => void;
    onExit: () => void;
}

export function AnkiCardView({ currentItem, questionsLeft, onRating, onExit }: AnkiCardViewProps) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<unknown>(undefined);

    // Calculate Next Intervals for UI using FSRS
    const getIntervalLabel = (rating: AnkiRating) => {
        if (!currentItem) return '-';

        // Initialize FSRS with default params (matching backend)
        const params = generatorParameters({ enable_fuzz: true });
        const fsrs = new FSRS(params);
        
        const now = new Date(); // Use actual current time for prediction

        // Construct Card from currentItem
        const card = createEmptyCard(now);
        // Map fields
        card.due = currentItem.nextReviewAt ? new Date(currentItem.nextReviewAt) : now;
        card.last_review = currentItem.lastReviewedAt ? new Date(currentItem.lastReviewedAt) : undefined;
        card.reps = currentItem.repetitions;
        card.stability = currentItem.stability || 0;
        card.difficulty = currentItem.difficulty || 0;
        card.elapsed_days = currentItem.elapsedDays || 0;
        card.scheduled_days = currentItem.scheduledDays || 0;
        card.lapses = currentItem.lapses || 0;
        
        // Map State
        if (currentItem.state !== undefined) {
             card.state = currentItem.state;
        } else {
             // Inference fallback
             if (currentItem.repetitions === 0) card.state = State.New;
             else if (currentItem.intervalDays < 1) card.state = State.Learning;
             else card.state = State.Review;
        }

        // Run Scheduler
        const repeat = fsrs.repeat(card, now);
        
        // Map Rating to FSRS Rating
        let fsrsRating = Rating.Good;
        if (rating === 'Again') fsrsRating = Rating.Again;
        if (rating === 'Hard') fsrsRating = Rating.Hard;
        if (rating === 'Good') fsrsRating = Rating.Good;
        if (rating === 'Easy') fsrsRating = Rating.Easy;

        const resultItem = repeat[fsrsRating];
        const nextDue = resultItem.card.due;
        
        // Diff
        const diffMs = nextDue.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

        if (diffMins < 1) return '<1m';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffMins < 24 * 60) {
            const hours = Math.round(diffMins / 60);
            return `${hours}h`;
        }
        return `${diffDays}d`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
            {/* Header */}
            <div className="p-4 flex justify-between items-center text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Exit
                </Button>
                <div className="bg-secondary px-3 py-1 rounded-full text-secondary-foreground font-medium">
                    Questions Left: {questionsLeft}
                </div>
                <div />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full p-6 pt-10">

                {/* Question Area */}
                <div className="w-full mb-8">
                    <ContentBlockDisplay
                        block={currentItem.questionId}
                        isTest={false} // Practice Mode
                        value={selectedAnswer}
                        onChange={(val) => {
                            setSelectedAnswer(val); 
                        }}
                        onSubmit={() => setShowAnswer(true)}
                        onShowAnswer={() => setShowAnswer(true)}
                    />
                </div>

                {/* Footer / Controls */}
                <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-6 z-10">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        {!showAnswer ? (
                            currentItem.questionId.kind === 'note' ? (
                                <Button
                                    className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={() => setShowAnswer(true)}
                                >
                                    Show Answer
                                </Button>
                            ) : null
                        ) : (
                            <div className="w-full grid grid-cols-4 gap-4">
                                <RatingButton
                                    label="Again"
                                    subLabel={getIntervalLabel('Again')}
                                    color="text-destructive"
                                    hoverBg="hover:bg-destructive/10"
                                    onClick={() => onRating('Again')}
                                />
                                <RatingButton
                                    label="Hard"
                                    subLabel={getIntervalLabel('Hard')}
                                    color="text-warning"
                                    hoverBg="hover:bg-warning/10"
                                    onClick={() => onRating('Hard')}
                                />
                                <RatingButton
                                    label="Good"
                                    subLabel={getIntervalLabel('Good')}
                                    color="text-success"
                                    hoverBg="hover:bg-success/10"
                                    border="border-t-4 border-success bg-secondary/50" // Highlight default
                                    onClick={() => onRating('Good')}
                                />
                                <RatingButton
                                    label="Easy"
                                    subLabel={getIntervalLabel('Easy')}
                                    color="text-blue-500 dark:text-blue-400"
                                    hoverBg="hover:bg-blue-500/10"
                                    onClick={() => onRating('Easy')}
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

interface RatingButtonProps {
    label: string;
    subLabel: string;
    color: string;
    hoverBg: string;
    onClick: () => void;
    border?: string;
}

function RatingButton({ label, subLabel, color, hoverBg, onClick, border = "border border-border bg-card" }: RatingButtonProps) {
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
