import type { ContentBlock } from '../../types/domain';
import { NoteBlock } from './NoteBlock';
import { McqBlock } from './McqBlock';
import { DescriptiveBlock } from './DescriptiveBlock';

import { GenericBlock } from './GenericBlock';

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
    case 'descriptive':
      return <DescriptiveBlock block={block} isTest={isTest} value={value} onChange={onChange} />;

    case 'generic':
      return <GenericBlock block={block} isTest={isTest} />;
    default:
      return (
        <div className="p-4 border border-dashed border-destructive rounded text-destructive bg-destructive/10">
          Unknown block type: {(block as any).kind}
        </div>
      );
  }
}
