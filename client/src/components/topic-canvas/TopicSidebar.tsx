import { Search, Filter, Plus, Loader2, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';
import type { ContentBlock, ContentBlockType } from '../../types/domain';
import { useNavigate } from 'react-router-dom';

interface TopicSidebarProps {
  spaceName?: string;
  subjectTitle?: string;
  topicTitle?: string;
  
  searchQuery: string;
  onSearchChange: (value: string) => void;
  
  isFilterActive: boolean;
  onOpenFilter: () => void;
  
  onAddBlock: (type: ContentBlockType) => void;
  
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function TopicSidebar({
  spaceName,
  subjectTitle,
  topicTitle,
  searchQuery,
  onSearchChange,
  isFilterActive,
  onOpenFilter,
  onAddBlock,
  blocks,
  selectedBlockId,
  onSelectBlock,
  isLoading,
  onLoadMore,
  hasMore
}: TopicSidebarProps) {
  const navigate = useNavigate();
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Trigger when within 50px of bottom
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (!isLoading && hasMore) {
        onLoadMore();
      }
    }
  };
  
  const blockTypes: { type: ContentBlockType; label: string }[] = [
    { type: 'note', label: 'Note' },
    { type: 'single_select_mcq', label: 'Single Choice' },
    { type: 'multi_select_mcq', label: 'Multi Choice' },
    { type: 'descriptive', label: 'Question' },
    { type: 'bulk' as any, label: 'Bulk Import (AI)' },
  ];

  const getBlockSummary = (block: ContentBlock) => {
    let title = '';
    let preview = '';
    
    if (block.kind === 'note') {
      title = block.content.split('\n')[0].replace(/^#+\s*/, '') || 'Untitled Note';
      preview = block.content.slice(0, 80).replace(/\n/g, ' ') + '...';
    } else if (block.kind === 'single_select_mcq' || block.kind === 'multi_select_mcq') {
       title = block.question;
       preview = 'Multiple Choice Question';
    } else if (block.kind === 'descriptive') {
      title = block.question;
      preview = block.answer ? block.answer.slice(0, 80) + '...' : 'Open Ended Question';
    } else {
      title = 'Generic Block';
      preview = 'Custom content';
    }

    if (title.length > 40) title = title.substring(0, 40) + '...';
    return { title, preview };
  };

  const getBlockTypeLabel = (kind: ContentBlockType) => {
    switch(kind) {
      case 'note': return 'NOTE';
      case 'single_select_mcq': return 'MCQ';
      case 'multi_select_mcq': return 'MCQ';
      case 'descriptive': return 'FACT';
      default: return 'GEN';
    }
  };

  const getBlockColorClasses = (kind: ContentBlockType) => {
    switch(kind) {
      case 'note': return 'bg-block-note-bg text-block-note-text border-block-note-border';
      case 'single_select_mcq': 
      case 'multi_select_mcq': return 'bg-block-mcq-bg text-block-mcq-text border-block-mcq-border';
      case 'descriptive': return 'bg-block-fact-bg text-block-fact-text border-block-fact-border';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <div className="w-80 md:w-96 border-r flex flex-col bg-muted/5 shrink-0 h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b space-y-4">
         <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Button variant="ghost" size="icon" className="h-5 w-5 -ml-1" onClick={() => navigate(-1)}>
               <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="truncate">{spaceName} / {subjectTitle}</span>
         </div>
         <h2 className="font-bold text-xl truncate">{topicTitle || 'Topic'}</h2>
         
         <div className="flex items-center gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
               <input 
                 className="w-full bg-background border rounded-md pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                 placeholder="Search..."
                 value={searchQuery}
                 onChange={(e) => onSearchChange(e.target.value)}
               />
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className={cn("h-8 w-8 shrink-0", isFilterActive && "text-primary border-primary")}
              onClick={onOpenFilter}
            >
              <Filter className="h-4 w-4" />
            </Button>

            <div className="relative group">
                <Button size="icon" className="h-8 w-8 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover text-popover-foreground border rounded shadow-lg z-50 hidden group-hover:block">
                   {blockTypes.map(t => (
                      <button 
                        key={t.type}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => onAddBlock(t.type)}
                      >
                        {t.label}
                      </button>
                   ))}
                </div>
            </div>
         </div>
      </div>

      {/* List */}
      <div 
        className="flex-1 overflow-y-auto p-2 space-y-2"
        onScroll={handleScroll}
      >
         {isLoading && blocks.length === 0 ? (
            <div className="flex justify-center p-4">
               <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
            </div>
         ) : blocks.length === 0 ? (
           <div className="text-center p-8 text-muted-foreground text-sm">
              No blocks found.
           </div>
         ) : (
           blocks.map((block, index) => {
             const isActive = selectedBlockId === block._id;
             const { title, preview } = getBlockSummary(block);
             const typeLabel = getBlockTypeLabel(block.kind);

             return (
               <div
                 key={block._id}
                 onClick={() => onSelectBlock(block._id)}
                 className={cn(
                   "group flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-all border select-none",
                   isActive 
                     ? "bg-primary/5 border-primary/20 shadow-sm" 
                     : "bg-background border-transparent hover:bg-muted/50 hover:border-border"
                 )}
               >
                 <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border", getBlockColorClasses(block.kind))}>
                      {typeLabel}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Q{index + 1}
                    </span>
                 </div>
                 <h3 className={cn("font-medium text-sm line-clamp-2 leading-tight mt-1", isActive ? "text-primary" : "text-foreground")}>
                    {title}
                 </h3>
                 <p className="text-xs text-muted-foreground line-clamp-2">
                    {preview}
                 </p>
               </div>
             );
           })
         )}
         {isLoading && blocks.length > 0 && (
            <div className="flex justify-center p-2">
               <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />
            </div>
         )}
      </div>
    </div>
  );
}
