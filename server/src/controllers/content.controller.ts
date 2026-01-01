
import type { Request, Response } from 'express';
import { ContentService } from '../services/content.service.ts';
import { z } from 'zod';
import type { IUser } from '../models/User.ts';
import { ContentBlockType } from '../models/ContentBlock.ts';

// Basic Zod schema for ContentBlock - can be improved with discriminated unions
const createContentSchema = z.object({
  topicId: z.string().min(1, 'Topic ID is required'),
  theme: z.string().optional(),
  kind: z.enum(ContentBlockType),
  content: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  group: z.string().optional(),
  hints: z.array(z.string()).optional(),
  blankAnswers: z.array(z.string()).optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.number().optional(),
});

const updateContentSchema = z.object({
  kind: z.enum(ContentBlockType).optional(),
  content: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  group: z.string().optional(),
  hints: z.array(z.string()).optional(),
  blankAnswers: z.array(z.string()).optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.number().optional(),
});

export class ContentController {

  static async import(req: Request, res: Response): Promise<void> {
    try {
      const user: any = req.user || { _id: '507f1f77bcf86cd799439011' }; // Fallback for testing
      const topicId = req.params.topicId;

      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      // Dynamic import to avoid startup issues if exceljs not ready
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer as any);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        res.status(400).json({ message: 'Invalid Excel file' });
        return;
      }

      const blocksToCreate: any[] = [];
      const count = await ContentService.count(topicId);
      const currentPosition = count || 0;

      // Skip header row
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        // Map columns based on our sample file structure
        // A: Type, B: Question, C-F: Options, G: Correct Option, H: Explanation, I: Hint
        // Also support 'fill_in_the_blank' specific columns if needed, but for now map broadly

        const typeRaw = row.getCell(1).text?.toLowerCase();
        // Simple mapping/validation of type
        let kind: any = ContentBlockType.GENERIC;
        if (Object.values(ContentBlockType).includes(typeRaw as any)) {
          kind = typeRaw;
        } else {
          // Try to fuzzy match or default
          if (typeRaw.includes('mcq')) kind = ContentBlockType.SINGLE_SELECT_MCQ;
          else if (typeRaw.includes('note')) kind = ContentBlockType.NOTE;
          else if (typeRaw.includes('fill')) kind = ContentBlockType.FILL_IN_THE_BLANK;
          else if (typeRaw.includes('desc')) kind = ContentBlockType.DESCRIPTIVE;
        }

        const question = row.getCell(2).text;
        const options: any[] = [];

        // Options 1-4
        [3, 4, 5, 6].forEach((colIdx, idx) => {
          const txt = row.getCell(colIdx).text;
          if (txt) {
            options.push({
              id: Date.now().toString() + idx + rowNumber,
              text: txt,
              isCorrect: false
            });
          }
        });

        const correctOptionVal = row.getCell(7).text;
        // Mark correct option
        if (correctOptionVal) {
          // Check if it says "Option 1" etc or matches text
          const optIdxMatch = correctOptionVal.match(/Option (\d)/i);
          if (optIdxMatch) {
            const idx = parseInt(optIdxMatch[1]) || 0; // Fixed parseInt possible NaN
            // 1-indexed to 0-indexed. parseInt("1") -> 1 -> idx 0.
            // If validation says "Option 1", idx should be 0.
            const targetIdx = idx - 1;
            if (options[targetIdx]) options[targetIdx].isCorrect = true;
          } else {
            // Text match
            const found = options.find(o => o.text.trim() === correctOptionVal.trim());
            if (found) found.isCorrect = true;
          }
        }

        const explanation = row.getCell(8).text;
        const hint = row.getCell(9).text;

        // Construct Block
        const block: any = {
          topicId,
          kind,
          question,
          explanation,
          hints: hint ? [hint] : [],
          position: currentPosition + rowNumber,
        };

        if (kind === ContentBlockType.NOTE) {
          block.content = question; // Use question col for note content
        } else if (kind === ContentBlockType.SINGLE_SELECT_MCQ || kind === ContentBlockType.MULTI_SELECT_MCQ) {
          block.options = options;
        } else if (kind === ContentBlockType.FILL_IN_THE_BLANK) {
          // For FITB, maybe allow storing answers in Correct Option col delimited?
          // Or just store raw for now.
          block.blankAnswers = correctOptionVal ? correctOptionVal.split(',').map(s => s.trim()) : [];
        } else if (kind === ContentBlockType.DESCRIPTIVE) {
          block.answer = correctOptionVal; // Use correct option col for model answer
        }

        blocksToCreate.push(block);
      });

      // Bulk Create
      const created = await Promise.all(
        blocksToCreate.map(data => ContentService.create(user._id.toString(), data))
      );

      res.status(201).json({ count: created.length, blocks: created });

    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({ message: 'Error importing content', error: error.message });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createContentSchema.parse(req.body);
      const user = req.user as IUser;
      const block = await ContentService.create((user._id as any).toString(), validatedData as any);
      res.status(201).json(block);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied to topic') {
        res.status(403).json({ message: 'Access denied to topic' });
        return;
      }
      res.status(500).json({ message: 'Error creating content block', error });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { types, tags, search } = req.query;

      const filterOptions: { types?: string[]; tags?: string[]; search?: string } = {};

      if (types) {
        const typeList = (typeof types === 'string' ? types.split(',') : types as string[])
          .map(t => t.trim())
          .filter(t => t.length > 0);

        if (typeList.length > 0) {
          filterOptions.types = typeList;
        }
      }

      if (tags) {
        const tagList = (typeof tags === 'string' ? tags.split(',') : tags as string[])
          .map(t => t.trim())
          .filter(t => t.length > 0);

        if (tagList.length > 0) {
          filterOptions.tags = tagList;
        }
      }

      if (search) {
        filterOptions.search = search as string;
      }

      const cursor = req.query.cursor ? (req.query.cursor as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await ContentService.findAll(
        (user._id as any).toString(),
        req.params.topicId as string,
        {
          ...filterOptions,
          limit,
          ...(cursor ? { cursor } : {})
        }
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Access denied to topic') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error fetching content blocks', error });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = updateContentSchema.parse(req.body);
      const user = req.user as IUser;
      const block = await ContentService.update((user._id as any).toString(), req.params.id as string, validatedData as any);

      if (!block) {
        res.status(404).json({ message: 'Content block not found' });
        return;
      }
      res.json(block);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error updating content block', error });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const block = await ContentService.delete((user._id as any).toString(), req.params.id as string);

      if (!block) {
        res.status(404).json({ message: 'Content block not found' });
        return;
      }
      res.json({ message: 'Content block deleted', block });
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error deleting content block', error });
    }
  }
}
