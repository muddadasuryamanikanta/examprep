import { useState, useEffect } from 'react';
import { PromptService } from '../../services/PromptService';
import type {
  ContentBlockType,
  McqOption,
  NoteBlock,
  SingleSelectMcqBlock,
  MultiSelectMcqBlock,
  FillInTheBlankBlock,
  ContentBlock
} from '../../types/domain';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Plus, Trash2 } from 'lucide-react';

interface ContentBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ContentBlock>) => void;
  initialData?: Partial<ContentBlock>;
  type: ContentBlockType;
}

export function ContentBlockModal({ isOpen, onClose, onSave, initialData, type }: ContentBlockModalProps) {

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

  // Fill in the Blank State


  useEffect(() => {
    if (isOpen) {


      setExplanation(initialData?.explanation || '');
      setNotes(initialData?.notes || '');
      setHints(initialData?.hints || []);
      setTags(initialData?.tags || []);

      if (initialData) {
        if (type === 'note') {
          setContent((initialData as NoteBlock).content || '');
        } else if (type === 'single_select_mcq' || type === 'multi_select_mcq') {
          const block = initialData as SingleSelectMcqBlock | MultiSelectMcqBlock;
          setQuestion(block.question || '');
          setOptions(block.options || []);
        } else if (type === 'fill_in_the_blank') {
          const blk = initialData as FillInTheBlankBlock;
          let editableQuestion = blk.question || '';
          const answers = blk.blankAnswers || [];

          // Re-hydrate brackets for editing: Replace {{blank}} with [answer] sequentially
          let answerIndex = 0;
          while (editableQuestion.includes('{{blank}}') && answerIndex < answers.length) {
            editableQuestion = editableQuestion.replace('{{blank}}', `[${answers[answerIndex]}]`);
            answerIndex++;
          }

          setQuestion(editableQuestion);
          // setBlankAnswers(answers);
        }
      } else {
        // Reset defaults
        setContent('');
        setQuestion('');
        setOptions([{ id: '1', text: '', isCorrect: false }, { id: '2', text: '', isCorrect: false }]);
        // setBlankAnswers([]);
        setHints([]);
        setTags([]);
        setTagInput('');
      }
    }
  }, [isOpen, initialData, type]);



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
        // Parse logic: Extract [answers] and replace with {{blank}}
        const regex = /\[(.*?)\]/g;
        const extractedAnswers: string[] = [];
        const formattedQuestion = question.replace(regex, (_, answer) => {
          extractedAnswers.push(answer);
          return '{{blank}}';
        });

        // Validation
        if (extractedAnswers.length === 0) {
          // Error handling could be improved, but for now we just won't save if no blanks
          // Ideally use a prompt or validation state, but keeping it simple as per request for "neat" code
          // Actually, let's at least not save broken data.
          PromptService.alert("Please define at least one blank using [brackets], e.g. 'Roses are [red]'.");
          return;
        }

        specificData = { question: formattedQuestion, blankAnswers: extractedAnswers };
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${initialData ? 'Edit' : 'Add'} ${type.replace(/_/g, ' ').toUpperCase()}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Block</Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">

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
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <textarea
              className="w-full bg-background border border-input rounded-md p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter question with blanks..."
            />
            <div className="text-xs text-muted-foreground">
              Define blanks using square brackets. E.g., "The capital of France is [Paris]."
            </div>
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

      </div>
    </Modal>
  );
}
