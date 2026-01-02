import type { ContentBlock } from '../../types/domain';
import { NoteBlock } from './NoteBlock';
import { McqBlock } from './McqBlock';


interface ContentBlockDisplayProps {
  block: ContentBlock;
  isTest?: boolean;
  value?: any;
  onChange?: (value: any) => void;
}

export function ContentBlockDisplay({ block, isTest = false, value, onChange }: ContentBlockDisplayProps) {
  switch (block.kind) {
    case 'note':
      return <NoteBlock block={block} isTest={isTest} />;
    case 'single_select_mcq':
    case 'multi_select_mcq':
      return <McqBlock block={block} isTest={isTest} value={value} onChange={onChange} />;
    case 'fill_in_the_blank':
      return <div className="p-4 border rounded bg-muted">Fill in the blank (Display pending)</div>;
    default:
      return (
        <div className="p-4 border border-dashed border-destructive rounded text-destructive bg-destructive/10">
          Unknown block type: {(block as any).kind}
        </div>
      );
  }
}
