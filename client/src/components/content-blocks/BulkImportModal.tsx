import { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Sparkles, Loader2, Check, Wand2, X, Upload } from 'lucide-react';
import { useContentStore } from '../../store/contentStore';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blocks: any[]) => Promise<void>;
}

export function BulkImportModal({ isOpen, onClose, onSave }: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'excel'>('ai');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Excel State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { generateAIContent } = useContentStore();
  const params = useParams();

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

  const handleExcelUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const urlParts = window.location.pathname.split('/');
    const topicIndex = urlParts.indexOf('topics');
    const topicId = topicIndex !== -1 ? urlParts[topicIndex + 1] : params.topicId;

    if (!topicId) {
      alert('Could not determine Topic ID from URL.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const token = localStorage.getItem('token');

      await axios.post(`${baseUrl}/api/topics/${topicId}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      alert('Import successful!');
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload Excel file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Content"
      footer={
        activeTab === 'ai' ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
            {generatedBlocks.length > 0 && (
              <Button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save {generatedBlocks.length} Blocks
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
          </>
        )
      }
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

        <div className="flex space-x-2 border-b mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Generation
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'excel' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('excel')}
          >
            Excel Import
          </button>
        </div>

        {activeTab === 'ai' && (
          <>
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
          </>
        )}

        {activeTab === 'excel' && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/5">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Upload Excel File</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
              Import questions from the sample Excel template.
            </p>

            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFileName(e.target.files[0].name);
                  handleExcelUpload();
                }
              }}
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="min-w-[140px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Uploading...
                </>
              ) : fileName ? (
                'Change File'
              ) : (
                'Select File'
              )}
            </Button>

            {fileName && !isUploading && (
              <p className="mt-2 text-sm text-success font-medium flex items-center gap-1">
                <Check className="h-3 w-3" /> {fileName}
              </p>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}
