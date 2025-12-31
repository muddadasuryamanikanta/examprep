import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { GenericBlock as GenericBlockType } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';

interface GenericBlockProps {
  block: GenericBlockType;
  isTest?: boolean;
}

export function GenericBlock({ block, isTest = false }: GenericBlockProps) {
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
      <div className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Generic Content</div>
      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
        {JSON.stringify(block.data, null, 2)}
      </pre>
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
