import { useState } from 'react';
import type { DescriptiveBlock as DescriptiveBlockType } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';
import { Button } from '../common/Button';

import { cn } from '../../lib/utils';

interface DescriptiveBlockProps {
  block: DescriptiveBlockType;
  isTest?: boolean;
  value?: string;
  onChange?: (val: any) => void;
}

export function DescriptiveBlock({ block, isTest = false, value, onChange }: DescriptiveBlockProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
      <h3 className="text-lg font-medium mb-4 text-foreground">{block.question}</h3>
      
      {isTest ? (
        <div className="mt-4">
             <textarea 
                  className="w-full min-h-[150px] p-3 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-y"
                  placeholder="Type your answer here..."
                  value={value || ''}
                  onChange={(e) => onChange && onChange(e.target.value)}
              />
        </div>
      ) : (
          block.answer && (
            <div className="mt-4">
               <Button variant="outline" size="sm" onClick={() => setShowAnswer(!showAnswer)}>
                 {showAnswer ? 'Hide Answer' : 'Show Answer'}
               </Button>
               
               {showAnswer && (
                 <div className="mt-3 p-4 bg-secondary/30 rounded-md border border-secondary text-foreground whitespace-pre-wrap">
                   {block.answer}
                 </div>
               )}
            </div>
          )
      )}

      {!isTest && (
        <BlockFooter 
            explanation={block.explanation} 
            notes={block.notes} 
            hints={block.hints} 
            visibleHints={visibleHints}
            onNextHint={() => setVisibleHints(prev => prev + 1)}
            showExplanation={showExplanation}
            onToggleExplanation={() => setShowExplanation(!showExplanation)}
        />
      )}
    </Card>
  );
}
