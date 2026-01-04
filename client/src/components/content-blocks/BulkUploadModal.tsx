import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileUp, Download, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { type ContentBlockType, type ContentBlock } from '../../types/domain';
import { PromptService } from '../../services/PromptService';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (blocks: Partial<ContentBlock>[]) => Promise<void>;
  topicId: string;
}

export function BulkUploadModal({ isOpen, onClose, onUpload, topicId }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedBlocks, setParsedBlocks] = useState<Partial<ContentBlock>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = ['Type', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Explanation', 'Tags', 'Note Content'];
    const data = [
      ['single_select_mcq', 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 'Paris', 'It is Paris.', 'geography, europe', ''],
      ['multi_select_mcq', 'Select prime numbers', '2', '4', '5', '9', '2, 5', '2 and 5 are prime.', 'math, numbers', ''],
      ['fill_in_the_blank', 'The sun rises in the {{blank}}.', '', '', '', '', 'east', 'Direction', 'science', ''],
      ['note', '', '', '', '', '', '', '', 'study-tip', '# Key Concept\nRemember this.'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "examprep_bulk_template.xlsx");
  };

  const parseExcel = async (file: File) => {
    setIsParsing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Remove header
      const rows = jsonData.slice(1);
      
      const blocks: Partial<ContentBlock>[] = [];

      rows.forEach((row) => {
        if (!row[0]) return; // Skip empty rows

        const kind = row[0] as ContentBlockType;
        const question = row[1] != null ? String(row[1]) : '';
        const opt1 = row[2];
        const opt2 = row[3];
        const opt3 = row[4];
        const opt4 = row[5];
        const correctRaw = row[6];
        const explanation = row[7] != null ? String(row[7]) : '';
        const tags = row[8] ? row[8].toString().split(',').map((t: string) => t.trim()) : [];
        const content = row[9] != null ? String(row[9]) : ''; // For notes

        // Cast to any to construct the object dynamically
        const block: any = {
          kind,
          tags,
          topicId
        };

        if (kind === 'note') {
          block.content = content || question || 'New Note';
        } else if (['single_select_mcq', 'multi_select_mcq'].includes(kind)) {
          block.question = question;
          block.explanation = explanation;
          
          const options = [];
          if (opt1 != null && String(opt1).trim()) options.push({ id: '1', text: String(opt1), isCorrect: false });
          if (opt2 != null && String(opt2).trim()) options.push({ id: '2', text: String(opt2), isCorrect: false });
          if (opt3 != null && String(opt3).trim()) options.push({ id: '3', text: String(opt3), isCorrect: false });
          if (opt4 != null && String(opt4).trim()) options.push({ id: '4', text: String(opt4), isCorrect: false });

          // Set correct answer
          if (correctRaw != null) {
             const corrects = String(correctRaw).toString().split(',').map((s: string) => s.trim().toLowerCase());
             options.forEach((opt: any) => {
                if (corrects.includes(String(opt.text).toLowerCase()) || corrects.includes(opt.id)) {
                   opt.isCorrect = true;
                }
             });
          }
          block.options = options;
        } else if (kind === 'fill_in_the_blank') {
           block.question = question;
           block.explanation = explanation;
           block.blankAnswers = correctRaw != null ? String(correctRaw).toString().split(',').map((s: string) => s.trim()) : [];
        }

        blocks.push(block as Partial<ContentBlock>);
      });

      setParsedBlocks(blocks);
    } catch (err) {
      console.error(err);
      PromptService.error("Failed to parse Excel file. Please ensure it matches the template.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      parseExcel(f);
    }
  };

  const handleUpload = async () => {
    if (parsedBlocks.length === 0) return;
    setIsUploading(true);
    try {
      await onUpload(parsedBlocks);
      PromptService.alert(`${parsedBlocks.length} blocks uploaded successfully!`);
      onClose();
      setFile(null);
      setParsedBlocks([]);
    } catch (err) {
        console.error(err);
        PromptService.error("Failed to upload blocks.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Content"
      // size="lg" - Removed as it might not be supported
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={parsedBlocks.length === 0 || isUploading}>
            {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload {parsedBlocks.length > 0 ? `(${parsedBlocks.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        
        {/* Template Download */}
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex items-center justify-between">
            <div className="flex gap-3 items-center">
               <div className="bg-primary/10 p-2 rounded-full">
                  <FileUp className="h-5 w-5 text-primary" />
               </div>
               <div>
                  <h4 className="text-sm font-medium">1. Prepare your data</h4>
                  <p className="text-xs text-muted-foreground">Download the template to format your questions correctly.</p>
               </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
               <Download className="h-3.5 w-3.5 mr-2" />
               Download Template
            </Button>
        </div>

        {/* Upload Area */}
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex items-center justify-between">
           <div className="flex gap-3 items-center">
               <div className="bg-primary/10 p-2 rounded-full">
                  <Upload className="h-5 w-5 text-primary" />
               </div>
               <div>
                  <h4 className="text-sm font-medium">2. Upload Excel File</h4>
                  <p className="text-xs text-muted-foreground">Supported formats: .xlsx, .xls</p>
               </div>
            </div>
            <div className="relative">
              <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  ref={fileInputRef}
              />
               <Button variant="secondary" size="sm">
                  {file ? 'Change File' : 'Select File'}
               </Button>
            </div>
        </div>

        {/* Preview */}
        {file && (
           <div className="border rounded-md overflow-hidden">
             <div className="bg-muted/50 px-4 py-2 border-b text-xs font-medium flex justify-between items-center">
                <span>Preview: {file.name}</span>
                {isParsing && <span className="text-muted-foreground">Parsing...</span>}
             </div>
             <div className="max-h-[300px] overflow-y-auto p-0">
                {parsedBlocks.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20 text-muted-foreground">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Type</th>
                        <th className="p-2 font-medium">Question/Content</th>
                        <th className="p-2 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                       {parsedBlocks.map((block: any, idx) => (
                         <tr key={idx} className="hover:bg-muted/10">
                           <td className="p-2 align-top font-mono text-muted-foreground uppercase text-[10px]">{block.kind === 'single_select_mcq' ? 'MCQ' : block.kind}</td>
                           <td className="p-2 align-top">
                              <p className="font-medium line-clamp-1">{block.question || block.content?.substring(0, 50)}</p>
                           </td>
                           <td className="p-2 align-top text-muted-foreground">
                              {block.options ? `${block.options.length} options` : block.blankAnswers ? `${block.blankAnswers.length} blanks` : '-'}
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                ) : (
                  !isParsing && <div className="p-8 text-center text-muted-foreground text-sm">No valid blocks found in file</div>
                )}
             </div>
           </div>
        )}

      </div>
    </Modal>
  );
}
