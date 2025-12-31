import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Sparkles, Loader2, Check, Wand2, X } from 'lucide-react';
import { useContentStore } from '../../store/contentStore';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blocks: any[]) => Promise<void>;
}

export function BulkImportModal({ isOpen, onClose, onSave }: BulkImportModalProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const { generateAIContent } = useContentStore();

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    setIsGenerating(true);
    setGeneratedBlocks([]);
    try {
      const data = await generateAIContent(input, 'bulk');
      // Expecting array of blocks
      if (Array.isArray(data)) {
        setGeneratedBlocks(data);
      } else {
        alert('Unexpected response format');
      }
    } catch (error) {
      console.error('AI Generation failed', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (generatedBlocks.length === 0) return;
    
    setIsSaving(true);
    try {
      await onSave(generatedBlocks);
      onClose();
      // Reset
      setInput('');
      setGeneratedBlocks([]);
    } catch (error) {
      console.error('Failed to save blocks', error);
      alert('Failed to save some blocks.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeBlock = (index: number) => {
    setGeneratedBlocks(generatedBlocks.filter((_, i) => i !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Content (AI)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
          {generatedBlocks.length > 0 && (
             <Button onClick={handleSaveAll} disabled={isSaving}>
               {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
               Save {generatedBlocks.length} Blocks
             </Button>
          )}
        </>
      }
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        
        {/* Input Section */}
        <div className="space-y-2">
          <div className="bg-muted/30 p-4 rounded-md border border-border">
             <div className="flex items-center gap-2 font-medium text-foreground mb-2">
               <Wand2 className="h-4 w-4" />
               <span className="text-sm">Generate Multiple MCQs</span>
             </div>
             <p className="text-xs text-muted-foreground mb-3">
               Paste a large block of text, notes, or existing questions. The AI will convert them into structured MCQs.
             </p>
             
             <textarea
                className="w-full bg-background border border-input rounded-md p-3 min-h-[150px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste content here..."
                disabled={isGenerating || generatedBlocks.length > 0}
             />
             
             {generatedBlocks.length === 0 && (
               <Button 
                 className="w-full mt-3"
                 onClick={handleGenerate}
                 disabled={isGenerating || !input.trim()}
                 size="sm"
               >
                 {isGenerating ? (
                   <>
                     <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" />
                     Generating...
                   </>
                 ) : (
                   <>
                     <Sparkles className="h-3.5 w-3.5 mr-2" />
                     Generate Blocks
                   </>
                 )}
               </Button>
             )}
          </div>
        </div>

        {/* Results Preview */}
        {generatedBlocks.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Preview ({generatedBlocks.length} items)</h3>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedBlocks([])} className="text-xs h-7">
                Reset
              </Button>
            </div>
            
            <div className="space-y-3">
              {generatedBlocks.map((block, idx) => (
                <div key={idx} className="relative p-3 border rounded-lg bg-card text-card-foreground shadow-sm group">
                  <button 
                    onClick={() => removeBlock(idx)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  <div className="pr-6">
                    <div className="text-xs font-bold uppercase text-muted-foreground mb-1">
                       MCQ
                    </div>
                    <p className="text-sm font-medium mb-2">{block.question}</p>
                    <ul className="space-y-1">
                      {block.options?.map((opt: any, i: number) => (
                        <li key={i} className={`text-xs flex items-center gap-2 ${opt.isCorrect ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${opt.isCorrect ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                           {opt.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
