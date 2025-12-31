import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { NoteBlock as NoteBlockType } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';

interface NoteBlockProps {
  block: NoteBlockType;
  isTest?: boolean;
}

export function NoteBlock({ block, isTest = false }: NoteBlockProps) {
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
      <div className="prose dark:prose-invert max-w-none text-foreground">
        <div className="whitespace-pre-wrap">{block.content}</div>
      </div>
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
