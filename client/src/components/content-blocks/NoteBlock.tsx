import { useState } from 'react';
import type { NoteBlock as NoteBlockType } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';

interface NoteBlockProps {
  block: NoteBlockType;
}

export function NoteBlock({ block }: NoteBlockProps) {
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="prose dark:prose-invert max-w-none text-foreground">
        {/* If we had a markdown renderer, we'd use it here. 
            For now, assuming it's text or pre-rendered HTML. 
            If it's raw HTML, we might need dangerouslySetInnerHTML, 
            but for safety and simplicity, let's treat it as text or simple paragraphs.
         */}
        <div className="whitespace-pre-wrap">{block.content}</div>
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
