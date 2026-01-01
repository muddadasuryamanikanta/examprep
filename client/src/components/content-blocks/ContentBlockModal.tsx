import { useState, useEffect } from 'react';
import type {
  ContentBlockType,
  McqOption,
  NoteBlock,
  SingleSelectMcqBlock,
  MultiSelectMcqBlock,
  DescriptiveBlock,
  GenericBlock,
  ContentBlock
} from '../../types/domain';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Plus, Trash2, Sparkles, Wand2, Loader2, PenTool } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useContentStore } from '../../store/contentStore';

interface ContentBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ContentBlock>) => void;
  initialData?: Partial<ContentBlock>;
  type: ContentBlockType;
}

export function ContentBlockModal({ isOpen, onClose, onSave, initialData, type }: ContentBlockModalProps) {
  // Mode State
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIContent = useContentStore(state => state.generateAIContent);

  // Common State
  const [explanation, setExplanation] = useState('');
  const [notes, setNotes] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Note State
  const [content, setContent] = useState('');

  const [question, setQuestion] = useState('');

  // MCQ State
  const [options, setOptions] = useState<McqOption[]>([]);

  // Answer State (Descriptive, Assertion)
  const [answer, setAnswer] = useState('');

  // Generic State
  const [jsonData, setJsonData] = useState('{}');

  // Blank Answers State
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset AI Mode
      setIsAiMode(false);
      setAiInput('');
      setIsGenerating(false);

      setExplanation(initialData?.explanation || '');
      setNotes(initialData?.notes || '');
      setHints(initialData?.hints || []);
      setTags(initialData?.tags || []);

      // Default blank answers
      setBlankAnswers([]);

      if (initialData) {
        if (type === 'note') {
          setContent((initialData as NoteBlock).content || '');
        } else if (type === 'single_select_mcq' || type === 'multi_select_mcq') {
          const block = initialData as SingleSelectMcqBlock | MultiSelectMcqBlock;
          setQuestion(block.question || '');
          setOptions(block.options || []);
        } else if (type === 'fill_in_the_blank') {
          setQuestion((initialData as any).question || '');
          setBlankAnswers((initialData as any).blankAnswers || []);
        } else if (type === 'descriptive') {
          setQuestion((initialData as DescriptiveBlock).question || '');
          setAnswer((initialData as DescriptiveBlock).answer || '');
        } else if (type === 'generic') {
          setJsonData(JSON.stringify((initialData as GenericBlock).data || {}, null, 2));
        }
      } else {
        // Reset defaults
        setContent('');
        setQuestion('');
        setOptions([{ id: '1', text: '', isCorrect: false }, { id: '2', text: '', isCorrect: false }]);
        setAnswer('');
        setHints([]);
        setTags([]);
        setTagInput('');
        setJsonData('{\n  "key": "value"\n}');
      }
    }
  }, [isOpen, initialData, type]);

  const handleGenerate = async () => {
    if (!aiInput.trim()) return;

    setIsGenerating(true);
    try {
      const data = await generateAIContent(aiInput, type) as any;

      // Populate context
      if (type === 'note') {
        if (data.content) setContent(data.content);
      } else if (type === 'single_select_mcq' || type === 'multi_select_mcq') {
        if (data.question) setQuestion(data.question);
        if (data.options && Array.isArray(data.options)) {
          setOptions(data.options.map((o: any, i: number) => ({
            id: Date.now().toString() + i,
            text: o.text || '',
            isCorrect: !!o.isCorrect
          })));
        }
        if (data.explanation) setExplanation(data.explanation);
      } else if (type === 'descriptive') {
        if (data.question) setQuestion(data.question);
        if (data.answer) setAnswer(data.answer);
      }

      // Allow user to review
      setIsAiMode(false);
    } catch (error) {
      console.error('AI Generation failed', error);
      alert('Failed to generate content. Please try again or use manual mode.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const common = {
      kind: type,
      explanation,
      notes,
      hints,
      tags
    };

    let specificData = {};

    switch (type) {
      case 'note':
        specificData = { content };
        break;
      case 'single_select_mcq':
      case 'multi_select_mcq':
        specificData = { question, options };
        break;
      case 'fill_in_the_blank':
        specificData = { question, blankAnswers };
        break;
      case 'descriptive':
        specificData = { question, answer };
        break;
      case 'generic':
        try {
          specificData = { data: JSON.parse(jsonData) };
        } catch (e) {
          alert('Invalid JSON');
          return;
        }
        break;
    }

    onSave({ ...common, ...specificData } as Partial<ContentBlock>);
    onClose();
  };

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '', isCorrect: false }]);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, field: keyof McqOption, value: any) => {
    const newOptions = [...options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    setOptions(newOptions);
  };

  const addBlankAnswer = () => setBlankAnswers([...blankAnswers, '']);
  const removeBlankAnswer = (idx: number) => setBlankAnswers(blankAnswers.filter((_, i) => i !== idx));
  const updateBlankAnswer = (idx: number, val: string) => {
    const newArr = [...blankAnswers];
    newArr[idx] = val;
    setBlankAnswers(newArr);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${initialData ? 'Edit' : 'Add'} ${type.replace(/_/g, ' ').toUpperCase()}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {!isAiMode && <Button onClick={handleSave}>Save Block</Button>}
        </>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">

        {/* Toggle Mode */}
        {!initialData && type !== 'generic' && (
          <div className="flex p-1 bg-muted rounded-lg mb-4">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all",
                !isAiMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setIsAiMode(false)}
            >
              <PenTool className="h-4 w-4" />
              Manual
            </button>
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all",
                isAiMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setIsAiMode(true)}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              AI Assist
            </button>
          </div>
        )}

        {isAiMode ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-muted/30 p-4 rounded-md border border-border">
              <h4 className="flex items-center gap-2 font-medium text-foreground mb-2">
                <Wand2 className="h-4 w-4" />
                Generate {type.replace(/_/g, ' ')} Content
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Paste your raw text (source material, rough notes, etc.) below. the AI will process it and format it into a {type} block for you to review.
              </p>

              <textarea
                className="w-full bg-background border border-input rounded-md p-3 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Paste context, paragraphs, or raw questions here..."
              />

              <Button
                className="w-full mt-4"
                onClick={handleGenerate}
                disabled={isGenerating || !aiInput.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Type Specific Fields */}
            {type === 'note' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Content (Markdown supported)</label>
                <textarea
                  className="w-full bg-background border border-input rounded-md p-3 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter note content..."
                />
              </div>
            )}

            {(type === 'single_select_mcq' || type === 'multi_select_mcq') && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <textarea
                    className="w-full bg-background border border-input rounded-md p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter question..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Options</label>
                  {options.map((opt, idx) => (
                    <div key={opt.id || idx} className="flex items-start gap-2">
                      <input
                        type={type === 'single_select_mcq' ? "radio" : "checkbox"}
                        name={type === 'single_select_mcq' ? "correct-option" : undefined}
                        className="mt-3 h-4 w-4"
                        checked={opt.isCorrect}
                        onChange={(e) => {
                          if (type === 'single_select_mcq') {
                            const newOptions = options.map((o, i) => ({
                              ...o,
                              isCorrect: i === idx
                            }));
                            setOptions(newOptions);
                          } else {
                            updateOption(idx, 'isCorrect', e.target.checked);
                          }
                        }}
                      />
                      <input
                        className="flex-1 bg-background border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={opt.text}
                        onChange={(e) => updateOption(idx, 'text', e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeOption(idx)} className="text-destructive h-9 w-9">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption} className="w-full mt-2">
                    <Plus className="h-4 w-4 mr-2" /> Add Option
                  </Button>
                </div>
              </>
            )}

            {type === 'fill_in_the_blank' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <p className="text-xs text-muted-foreground">Use underscores (____) to represent blanks.</p>
                  <textarea
                    className="w-full bg-background border border-input rounded-md p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="E.g. The capital of France is ____."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct Answers (in order)</label>
                  {blankAnswers.map((ans, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-9 text-xs font-mono text-muted-foreground">{idx + 1}</span>
                      <input
                        className="flex-1 bg-background border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={ans}
                        onChange={(e) => updateBlankAnswer(idx, e.target.value)}
                        placeholder="Answer"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeBlankAnswer(idx)} className="text-destructive h-9 w-9">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addBlankAnswer} className="w-full mt-2">
                    <Plus className="h-4 w-4 mr-2" /> Add Answer Slot
                  </Button>
                </div>
              </>
            )}

            {type === 'descriptive' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Question
                  </label>
                  <textarea
                    className="w-full bg-background border border-input rounded-md p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter question..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Model Answer
                  </label>
                  <textarea
                    className="w-full bg-background border border-input rounded-md p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter answer or detailed reason..."
                  />
                </div>
              </>
            )}

            {type === 'generic' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">JSON Data</label>
                <textarea
                  className="w-full bg-background border border-input rounded-md p-2 min-h-[200px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                />
              </div>
            )}

            {/* Tags Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-background border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (tagInput.trim()) {
                        setTags([...tags, tagInput.trim()]);
                        setTagInput('');
                      }
                    }
                  }}
                  placeholder="Add a tag..."
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (tagInput.trim()) {
                      setTags([...tags, tagInput.trim()]);
                      setTagInput('');
                    }
                  }}
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                      <span>#{tag}</span>
                      <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="ml-1 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Common Fields */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hints</label>
                {hints.map((hint, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-background border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={hint}
                      onChange={(e) => {
                        const newHints = [...hints];
                        newHints[idx] = e.target.value;
                        setHints(newHints);
                      }}
                      placeholder={`Hint ${idx + 1}`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setHints(hints.filter((_, i) => i !== idx))} className="text-destructive h-9 w-9">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setHints([...hints, ''])} className="w-full mt-1">
                  <Plus className="h-4 w-4 mr-2" /> Add Hint
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Explanation</label>
                  <textarea
                    className="w-full bg-background border border-input rounded-md p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Detailed explanation..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    className="w-full bg-background border border-input rounded-md p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </Modal>
  );
}
