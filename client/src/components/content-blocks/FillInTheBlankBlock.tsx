import { useState } from 'react';
import type { FillInTheBlankBlock } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';
import { RotateCcw, Eye, Send } from 'lucide-react';

interface FillInTheBlankBlockProps {
    block: FillInTheBlankBlock;
    isTest?: boolean;
    value?: string[];
    onChange?: (val: string[]) => void;
    onSubmit?: () => void;
}

export function FillInTheBlankBlock({ block, isTest = false, value, onChange, onSubmit }: FillInTheBlankBlockProps) {
    // block.question contains text with blanks like "The capital of France is ___."
    // or maybe specific markers. Let's assume standard format or regex.
    // Ideally, the backend provides the segments. If not, we split by `___` or `{{blank}}`.
    // Prompt implied we need to handle "text for blanks". 
    // Let's assume the question text has `___` as placeholders for now.

    const [localAnswers, setLocalAnswers] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [visibleHints, setVisibleHints] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    // Parse blanks
    const parts = block.question.split('___');
    const numBlanks = parts.length - 1;

    // Initialize state
    const currentAnswers = value || localAnswers;

    // Prepare correct answers (assuming block.blankAnswers is ordered array)
    const correctAnswers = block.blankAnswers || [];

    const handleInputChange = (index: number, val: string) => {
        if (isSubmitted && !isTest) return;

        const newAnswers = [...currentAnswers];
        // Fill up to index if sparse
        while (newAnswers.length <= index) newAnswers.push('');

        newAnswers[index] = val;

        if (onChange) onChange(newAnswers);
        else setLocalAnswers(newAnswers);
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        if (onSubmit) onSubmit(); // Trigger parent submit
    };

    const handleReset = () => {
        if (onChange) onChange([]);
        else setLocalAnswers([]);

        setIsSubmitted(false);
        setShowAnswer(false);
        setVisibleHints(0);
        setShowExplanation(false);
    };

    // Helper to check correctness per blank
    const isCorrect = (index: number) => {
        const userAns = (currentAnswers[index] || '').trim().toLowerCase();
        const correctAns = (correctAnswers[index] || '').trim().toLowerCase();
        return userAns === correctAns;
    };

    return (
        <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
            <h3 className="text-lg font-medium mb-4 text-foreground flex items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded-sm mr-2 align-middle border border-border shrink-0">
                    Fill In Blanks
                </span>
                <span className="flex-1">Fill in the missing terms:</span>
            </h3>

            <div className="text-lg leading-loose mb-6">
                {parts.map((part, i) => (
                    <span key={i}>
                        {part}
                        {i < numBlanks && (
                            <span className="inline-block mx-1">
                                <input
                                    type="text"
                                    value={currentAnswers[i] || ''}
                                    onChange={(e) => handleInputChange(i, e.target.value)}
                                    disabled={!isTest && (isSubmitted || showAnswer)}
                                    className={cn(
                                        "border-b-2 bg-transparent px-1 min-w-[100px] text-center focus:outline-none transition-colors",
                                        (!isTest && (isSubmitted || showAnswer))
                                            ? isCorrect(i)
                                                ? "border-success text-success font-bold"
                                                : "border-destructive text-destructive font-bold"
                                            : "border-muted-foreground focus:border-primary"
                                    )}
                                    placeholder="..."
                                />
                                {(!isTest && (isSubmitted || showAnswer) && !isCorrect(i)) && (
                                    <span className="text-sm text-success font-medium ml-1">
                                        ({correctAnswers[i]})
                                    </span>
                                )}
                            </span>
                        )}
                    </span>
                ))}
            </div>

            {!isTest && (
                <>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        {!isSubmitted ? (
                            <Button onClick={handleSubmit}>
                                <Send className="w-4 h-4 mr-2" /> Submit
                            </Button>
                        ) : (isSubmitted || showAnswer || visibleHints > 0 || showExplanation) ? (
                            <Button variant="outline" onClick={handleReset}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Reset
                            </Button>
                        ) : null}

                        <Button
                            variant="ghost"
                            onClick={() => setShowAnswer(!showAnswer)}
                            className={cn("text-muted-foreground", showAnswer && "text-primary")}
                        >
                            <Eye className="w-4 h-4 mr-2" /> {showAnswer ? "Hide Answer" : "Show Answer"}
                        </Button>
                    </div>

                    <BlockFooter
                        explanation={block.explanation}
                        notes={block.notes}
                        hints={block.hints}
                        visibleHints={visibleHints}
                        onNextHint={() => setVisibleHints(prev => prev + 1)}
                        showExplanation={showExplanation}
                        onToggleExplanation={() => setShowExplanation(!showExplanation)}
                    />
                </>
            )}
        </Card>
    );
}
