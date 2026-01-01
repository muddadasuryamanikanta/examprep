import { Button } from '../common/Button';
import { ContentBlockDisplay } from '../content-blocks/ContentBlockDisplay';
import { ArrowRight, Bookmark, Trash2, Save } from 'lucide-react';

interface QuestionAreaProps {
    questionIndex: number;
    questionBlock: any; // Ideally strictly typed
    userAnswer: unknown;
    onAnswerChange: (value: unknown) => void;
    onMarkForReview: () => void;
    onClearResponse: () => void;
    onSaveAndNext: () => void;
    isLastQuestion?: boolean;
}

export function QuestionArea({
    questionIndex,
    questionBlock,
    userAnswer,
    onAnswerChange,
    onMarkForReview,
    onClearResponse,
    onSaveAndNext,
    isLastQuestion = false
}: QuestionAreaProps) {
    if (!questionBlock) return <div className="p-8 text-center text-muted-foreground">Question not found</div>;

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background relative z-0 h-full">
            {/* Question Header */}
            <div className="h-14 border-b flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Question</span>
                    <span className="font-bold text-xl text-foreground font-mono">{questionIndex + 1}</span>
                </div>
                {/* Optional: Add section info or marks info here */}
            </div>

            {/* Question Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <ContentBlockDisplay 
                        block={questionBlock} 
                        isTest={true}
                        value={userAnswer} 
                        onChange={onAnswerChange}
                    /> 
                </div>
            </div>

            {/* Footer Actions */}
            <div className="h-20 border-t bg-card px-6 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <div className="flex gap-3">
                    <Button 
                        variant="secondary" 
                        className="border shadow-sm gap-2 hover:bg-mark/10 hover:text-mark hover:border-mark/50 transition-colors" 
                        onClick={onMarkForReview}
                    >
                        <Bookmark className="w-4 h-4" />
                        <span className="hidden sm:inline">Mark for Review & Next</span>
                        <span className="sm:hidden">Mark</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2" 
                        onClick={onClearResponse}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Clear Response</span>
                    </Button>
                </div>
                
                <Button 
                    onClick={onSaveAndNext} 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px] h-11 text-base shadow-lg shadow-primary/20 gap-2"
                >
                    <Save className="w-4 h-4" />
                    {isLastQuestion ? 'Save' : 'Save & Next'}
                    {!isLastQuestion && <ArrowRight className="w-4 h-4 opacity-70" />}
                </Button>
            </div>
        </div>
    );
}
