import { useState } from 'react';
import type { SingleSelectMcqBlock, MultiSelectMcqBlock } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';
import { CheckSquare, Square, CheckCircle2, XCircle, RotateCcw, Eye, Send } from 'lucide-react';

interface McqBlockProps {
  block: SingleSelectMcqBlock | MultiSelectMcqBlock;
}

export function McqBlock({ block }: McqBlockProps) {
  const isMulti = block.kind === 'multi_select_mcq';
  
  // Unified state
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (id: string) => {
    if (isSubmitted) return;

    if (isMulti) {
      setSelectedOptionIds(prev => 
        prev.includes(id) 
          ? prev.filter(oid => oid !== id) 
          : [...prev, id]
      );
    } else {
      // Single select behavior: Select and auto-submit
      setSelectedOptionIds([id]);
      setIsSubmitted(true);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelectedOptionIds([]);
    setIsSubmitted(false);
    setShowAnswer(false);
    setVisibleHints(0);
    setShowExplanation(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <h3 className="text-lg font-medium mb-4 text-foreground flex items-center">
        {isMulti && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded-sm mr-2 align-middle border border-border shrink-0">
            Multi-Select
          </span>
        )}
        <span>{block.question}</span>
      </h3>
      
      <div className="space-y-2">
        {block.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          const isCorrect = option.isCorrect;
          
          let containerClass = "border-border hover:bg-accent/50 cursor-pointer";
          let textClass = "text-foreground";
          
          // Icon selection based on type
          let icon;
          if (isMulti) {
            icon = isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />;
          } else {
             // Radio-like behavior for single select
             // Using similar visual style to the original SingleSelectMcqBlock
             icon = (
               <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                   isSelected ? "border-primary" : "border-muted-foreground"
               )}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
               </div>
             );
          }

          if (isSubmitted || showAnswer) {
            containerClass = "cursor-default border-border opacity-60"; // Default dim
            
            // Logic for coloring - Unified from MultiSelect logic which is more comprehensive
            if (showAnswer) {
              if (isCorrect) {
                  containerClass = "border-success bg-success/10 opacity-100";
                  textClass = "text-success font-medium";
                  icon = <CheckCircle2 className="w-5 h-5 text-success" />;
              }
            } else if (isSubmitted) {
               if (isSelected && isCorrect) {
                  containerClass = "border-success bg-success/10 opacity-100";
                  textClass = "text-success font-medium";
                  icon = <CheckCircle2 className="w-5 h-5 text-success" />;
               } else if (isSelected && !isCorrect) {
                  containerClass = "border-destructive bg-destructive/10 opacity-100";
                  textClass = "text-destructive font-medium";
                  icon = <XCircle className="w-5 h-5 text-destructive" />;
               } else if (!isSelected && isCorrect) {
                  // For single select, let's also show the correct answer if they got it wrong, similar to MultiSelect
                  containerClass = "border-success border-dashed opacity-80"; 
                  textClass = "text-success";
                  icon = <CheckCircle2 className="w-5 h-5 text-success opacity-50" />;
               }
            }
          } else {
            // Interactive mode
            if (isSelected) {
                containerClass = "border-primary bg-primary/5 hover:bg-primary/10";
            }
          }

          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "flex items-center p-3 rounded-md border transition-all",
                containerClass
              )}
            >
              <div className="mr-3 flex items-center justify-center shrink-0">
                {icon}
              </div>
              <span className={cn("flex-1", textClass)}>
                {option.text}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isMulti && !isSubmitted ? (
           <Button onClick={handleSubmit} disabled={selectedOptionIds.length === 0}>
             <Send className="w-4 h-4 mr-2" /> Submit
           </Button>
        ) : (isSubmitted || selectedOptionIds.length > 0 || showAnswer || visibleHints > 0 || showExplanation) ? ( 
           // Show reset if submitted OR if we have a selection OR showAnswer/Hints/Explanation is active
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
    </Card>
  );
}
