import type { GenericBlock as GenericBlockType } from '../../types/domain';
import { Card } from '../common/Card';
import { BlockFooter } from './BlockFooter';

interface GenericBlockProps {
  block: GenericBlockType;
}

export function GenericBlock({ block }: GenericBlockProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Generic Content</div>
      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
        {JSON.stringify(block.data, null, 2)}
      </pre>
      <BlockFooter explanation={block.explanation} notes={block.notes} />
    </Card>
  );
}
