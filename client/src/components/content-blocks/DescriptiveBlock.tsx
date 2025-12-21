import { useState } from 'react';
import type { DescriptiveBlock as DescriptiveBlockType } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';
import { Button } from '../common/Button';

interface DescriptiveBlockProps {
  block: DescriptiveBlockType;
}

export function DescriptiveBlock({ block }: DescriptiveBlockProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <h3 className="text-lg font-medium mb-4 text-foreground">{block.question}</h3>
      
      {block.answer && (
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
      )}

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
