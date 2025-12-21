import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Loader2, Pencil, Plus, ChevronDown, Filter, Tag } from 'lucide-react';
import { type ContentBlock, type ContentBlockType } from '../types/domain';
import { useContentStore } from '../store/contentStore';
import { useSpaceStore } from '../store/spaceStore';
import { Button } from '../components/common/Button';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ContentBlockDisplay } from '../components/content-blocks/ContentBlockDisplay';
import { ContentBlockModal } from '../components/content-blocks/ContentBlockModal';

export default function TopicCanvas() {
  const { spaceSlug, subjectSlug, topicSlug } = useParams();
  
  // Stores
  const { currentSpace, fetchSpace } = useSpaceStore();
  const { 
    currentSubject, 
    setCurrentSubject, 
    subjects, 
    fetchSubjects, // Resolve hierarchy
    currentTopic,
    setCurrentTopic,
    topics,
    fetchTopics,
    blocks, 
    isLoading, // block loading
    fetchBlocks, 
    addBlock, 
    updateBlock, 
    deleteBlock 
  } = useContentStore();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [modalType, setModalType] = useState<ContentBlockType>('note');

  // UI State
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<ContentBlockType | 'all'>('all');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  useEffect(() => {
    if (spaceSlug && subjectSlug && topicSlug) {
      if (!currentSpace || currentSpace.slug !== spaceSlug) fetchSpace(spaceSlug);
      
      // Hierarchy resolution
      if (!currentSubject || currentSubject.slug !== subjectSlug) {
        if (subjects.length > 0) {
          const found = subjects.find(s => s.slug === subjectSlug);
            if (found) setCurrentSubject(found);
          else fetchSubjects(spaceSlug); // Fallback fetch
        } else {
          fetchSubjects(spaceSlug);
        }
      }
      
      if (!currentTopic || currentTopic.slug !== topicSlug) {
           if (topics.length > 0) {
             const found = topics.find(t => t.slug === topicSlug);
               if (found) setCurrentTopic(found);
               else fetchTopics(subjectSlug);
           } else {
             fetchTopics(subjectSlug);
           }
      }

      fetchBlocks(topicSlug);
    }
  }, [spaceSlug, subjectSlug, topicSlug, fetchSpace, fetchSubjects, fetchTopics, fetchBlocks]);

  // Update effect to catch hierarchy loads if they were async
  useEffect(() => {
    if (subjectSlug && (!currentSubject || currentSubject.slug !== subjectSlug) && subjects.length > 0) {
      const found = subjects.find(s => s.slug === subjectSlug);
          if (found) setCurrentSubject(found);
      }
    if (topicSlug && (!currentTopic || currentTopic.slug !== topicSlug) && topics.length > 0) {
      const found = topics.find(t => t.slug === topicSlug);
          if (found) setCurrentTopic(found);
      }
  }, [subjects, topics, subjectSlug, topicSlug, currentSubject, currentTopic, setCurrentSubject, setCurrentTopic]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddBlockClick = (type: ContentBlockType) => {
    setModalType(type);
    setEditingBlock(null);
    setIsModalOpen(true);
    setIsAddMenuOpen(false);
  };

  const handleEditBlockClick = (block: ContentBlock) => {
    setModalType(block.kind);
    setEditingBlock(block);
    setIsModalOpen(true);
  };

  const handleSaveBlock = async (data: Partial<ContentBlock>) => {
    if (!topicSlug) return;
    
    try {
      if (editingBlock) {
        await updateBlock(editingBlock._id, data);
      } else {
        await addBlock(topicSlug, data.kind as ContentBlockType, data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Delete this block?')) return;
    try {
      await deleteBlock(id);
    } catch (err) {
      console.error(err);
    }
  };

  const renderBlock = (block: ContentBlock) => {
    return (
      <div key={block._id} className="group relative">
        <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">

           
           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditBlockClick(block)}>
             <Pencil className="h-4 w-4" />
           </Button>

           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteBlock(block._id)}>
             <Trash2 className="h-4 w-4" />
           </Button>
        </div>

        <div className="pl-0">
          <ContentBlockDisplay block={block} />
        </div>
      </div>
    );
  };

  // Filter Logic
  const allTags = Array.from(new Set(blocks.flatMap(b => b.tags || [])));
  
  const filteredBlocks = blocks.filter(block => {
    // Type Filter
    if (activeTypeFilter !== 'all' && block.kind !== activeTypeFilter) return false;
    
    // Tag Filter
    if (activeTagFilter && (!block.tags || !block.tags.includes(activeTagFilter))) return false;
    
    return true;
  });

  const blockTypes: { type: ContentBlockType; label: string }[] = [
    { type: 'note', label: 'Note' },
    { type: 'single_select_mcq', label: 'Single Choice' },
    { type: 'multi_select_mcq', label: 'Multi Choice' },
    { type: 'descriptive', label: 'Question' },

  ];

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceSlug}/library` },
            { label: currentSubject?.title || <div className="h-4 w-32 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceSlug}/${subjectSlug}` },
             { label: currentTopic?.title || <div className="h-4 w-40 bg-muted animate-pulse rounded" /> }
          ]}
        />
      </div>

      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{currentTopic?.title}</h1>
          <p className="text-muted-foreground">Add and manage content blocks for this topic.</p>
        </div>
        
        <div className="relative" ref={addMenuRef}>
          <Button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}>
            <Plus className="mr-2 h-4 w-4" /> Add Content <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          
          {isAddMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-popover p-1 shadow-lg z-50 bg-background">
              {blockTypes.map(({ type, label }) => (
                <button
                  key={type}
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  onClick={() => handleAddBlockClick(type)}
                >
                  {label}
                </button>
              ))}
              <div className="h-px my-1 bg-muted" />
              <button
                 className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                 onClick={() => handleAddBlockClick('generic')}
              >
                Generic Block
              </button>
            </div>
          )}
        </div>
      </header>
      
      {/* Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <Filter className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Button 
            variant={activeTypeFilter === 'all' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setActiveTypeFilter('all')}
            className="rounded-full"
          >
            All Types
          </Button>
          {blockTypes.map(({ type, label }) => (
            <Button 
              key={type}
              variant={activeTypeFilter === type ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setActiveTypeFilter(type)}
              className="rounded-full whitespace-nowrap"
            >
              {label}
            </Button>
          ))}
        </div>
        
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <Tag className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
             <Button 
              variant={activeTagFilter === null ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setActiveTagFilter(null)}
              className="rounded-full h-7 text-xs"
            >
              All Tags
            </Button>
            {allTags.map(tag => (
              <Button 
                key={tag}
                variant={activeTagFilter === tag ? 'primary' : 'outline'} 
                size="sm" 
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className="rounded-full h-7 text-xs"
              >
                #{tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8 min-h-[60vh] pb-32">
        {isLoading && blocks.length === 0 ? (
           <div className="flex justify-center p-8">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-muted rounded-lg">
             <div className="rounded-full bg-muted p-4 mb-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-semibold">No content found</h3>
             <p className="text-muted-foreground max-w-sm mt-2">
               {activeTypeFilter !== 'all' || activeTagFilter 
                 ? "Try adjusting your filters to see more content." 
                 : "Get started by adding some content blocks to this topic."}
             </p>
             {blocks.length === 0 && (
                <div className="mt-6">
                  <Button onClick={() => setIsAddMenuOpen(true)}>Add your first block</Button>
                </div>
             )}
          </div>
        ) : (
           filteredBlocks.map(renderBlock)
        )}
      </div>
      
      <ContentBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBlock}
        type={modalType}
        initialData={editingBlock || undefined}
      />
    </div>
  );
}
