
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
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.number().optional(),
});

export class ContentController {

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
      const blocks = await ContentService.findAll((user._id as any).toString(), req.params.topicId as string);
      res.json(blocks);
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
