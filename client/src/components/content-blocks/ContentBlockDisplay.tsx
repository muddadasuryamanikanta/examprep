import type { ContentBlock } from '../../types/domain';
import { NoteBlock } from './NoteBlock';
import { McqBlock } from './McqBlock';
import { DescriptiveBlock } from './DescriptiveBlock';

import { GenericBlock } from './GenericBlock';

interface ContentBlockDisplayProps {
  block: ContentBlock;
}

export function ContentBlockDisplay({ block }: ContentBlockDisplayProps) {
  switch (block.kind) {
    case 'note':
      return <NoteBlock block={block} />;
    case 'single_select_mcq':
    case 'multi_select_mcq':
      return <McqBlock block={block} />;
    case 'descriptive':
      return <DescriptiveBlock block={block} />;

    case 'generic':
      return <GenericBlock block={block} />;
    default:
      return (
        <div className="p-4 border border-dashed border-red-300 rounded text-red-500 bg-red-50">
          Unknown block type: {(block as any).kind}
        </div>
      );
  }
}
