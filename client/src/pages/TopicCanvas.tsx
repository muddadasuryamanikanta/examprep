import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, GripVertical, Loader2 } from 'lucide-react';
import { type ContentBlock, type ContentBlockType } from '../types/domain';
import { useContentStore } from '../store/contentStore';
import { useSpaceStore } from '../store/spaceStore';
import { Button } from '../components/common/Button';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

export default function TopicCanvas() {
  const { spaceId, subjectId, topicId } = useParams();
  
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

  useEffect(() => {
    if (spaceId && subjectId && topicId) {
      if (!currentSpace || currentSpace._id !== spaceId) fetchSpace(spaceId);
      
      // Hierarchy resolution
      if (!currentSubject || currentSubject._id !== subjectId) {
        if (subjects.length > 0) {
            const found = subjects.find(s => s._id === subjectId);
            if (found) setCurrentSubject(found);
            else fetchSubjects(spaceId); // Fallback fetch
        } else {
             fetchSubjects(spaceId);
        }
      }
      
      if (!currentTopic || currentTopic._id !== topicId) {
           if (topics.length > 0) {
               const found = topics.find(t => t._id === topicId);
               if (found) setCurrentTopic(found);
               else fetchTopics(subjectId);
           } else {
               fetchTopics(subjectId);
           }
      }

      fetchBlocks(topicId);
    }
  }, [spaceId, subjectId, topicId, fetchSpace, fetchSubjects, fetchTopics, fetchBlocks]);

  // Update effect to catch hierarchy loads if they were async
  useEffect(() => {
      if (subjectId && (!currentSubject || currentSubject._id !== subjectId) && subjects.length > 0) {
          const found = subjects.find(s => s._id === subjectId);
          if (found) setCurrentSubject(found);
      }
      if (topicId && (!currentTopic || currentTopic._id !== topicId) && topics.length > 0) {
          const found = topics.find(t => t._id === topicId);
          if (found) setCurrentTopic(found);
      }
  }, [subjects, topics, subjectId, topicId, currentSubject, currentTopic, setCurrentSubject, setCurrentTopic]);


  const handleAddBlock = async (type: ContentBlockType) => {
    if (!topicId) return;
    try {
      await addBlock(topicId, type);
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
      <div key={block._id} className="group relative rounded-lg border border-transparent hover:border-border p-4 transition-all">
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteBlock(block._id)}>
             <Trash2 className="h-4 w-4" />
           </Button>
        </div>

        {/* Drag Handle Placeholder */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move p-2 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="pl-6">
          {block.kind === 'note' && (
            <textarea
              className="w-full bg-transparent resize-none outline-none text-muted-foreground focus:text-foreground transition-colors"
              rows={Math.max(2, (block.content?.split('\n').length || 1))}
              value={block.content || ''}
              onChange={(e) => updateBlock(block._id, { content: e.target.value })}
              placeholder="Type your notes here..."
            />
          )}

          {block.kind === 'mcq' && (
            <div className="space-y-4">
               <input
                className="w-full bg-transparent font-medium outline-none border-b border-transparent focus:border-input pb-1 transition-colors"
                value={block.question || ''}
                onChange={(e) => updateBlock(block._id, { question: e.target.value })}
                placeholder="Question here..."
              />
              <div className="space-y-2">
                {block.options?.map((opt, idx) => (
                   <div key={idx} className="flex items-center gap-2">
                     <div className="h-4 w-4 rounded-full border border-primary/20" />
                     <input
                       className="flex-1 bg-transparent text-sm outline-none"
                       value={opt.text}
                       onChange={(e) => {
                         const newOptions = [...(block.options || [])];
                         newOptions[idx] = { ...opt, text: e.target.value };
                         updateBlock(block._id, { options: newOptions });
                       }}
                     />
                   </div>
                ))}
                <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => {
                     const newOptions = [...(block.options || []), { id: Date.now().toString(), text: 'New Option', isCorrect: false }];
                     updateBlock(block._id, { options: newOptions });
                   }}
                >
                  + Add Option
                </Button>
              </div>
            </div>
          )}

          {block.kind === 'descriptive' && (
            <div className="space-y-4">
               <input
                className="w-full bg-transparent font-medium outline-none border-b border-transparent focus:border-input pb-1 transition-colors"
                value={block.question || ''}
                onChange={(e) => updateBlock(block._id, { question: e.target.value })}
                placeholder="Descriptive question here..."
              />
              <textarea
                className="w-full bg-secondary/30 rounded-md p-3 text-sm resize-none outline-none min-h-[100px]"
                value={block.answer || ''}
                onChange={(e) => updateBlock(block._id, { answer: e.target.value })}
                placeholder="Model answer or reference notes..."
              />
            </div>
          )}

           {block.kind === 'generic' && (
            <div className="p-4 bg-secondary/20 rounded-md text-center text-sm text-muted-foreground border border-dashed border-border">
              Generic Block (Future Use)
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceId}/library` },
            { label: currentSubject?.title || <div className="h-4 w-32 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceId}/${subjectId}` },
             { label: currentTopic?.title || <div className="h-4 w-40 bg-muted animate-pulse rounded" /> }
          ]}
        />
      </div>

      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{currentTopic?.title}</h1>
        <p className="text-muted-foreground">Add content blocks below to build your topic.</p>
      </header>

      <div className="space-y-8 min-h-[60vh] pb-32">
        {isLoading && blocks.length === 0 ? (
           <div className="flex justify-center p-8">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : (
           blocks.map(renderBlock)
        )}

        {/* Add Block Area */}
        <div className="flex items-center justify-center gap-4 py-8 border-t border-dashed border-border mt-8">
          <span className="text-sm font-medium text-muted-foreground mr-2">Add Block:</span>
          <Button variant="secondary" size="sm" onClick={() => handleAddBlock('note')}>Note</Button>
          <Button variant="secondary" size="sm" onClick={() => handleAddBlock('mcq')}>MCQ</Button>
          <Button variant="secondary" size="sm" onClick={() => handleAddBlock('descriptive')}>Question</Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddBlock('generic')}>Generic</Button>
        </div>
      </div>
    </div>
  );
}
