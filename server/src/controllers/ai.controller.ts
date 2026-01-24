
import type { Request, Response } from 'express';
import openRouter from '@/config/openrouter.ts';
import { ContentBlockType } from '@/models/ContentBlock.ts';

export class AiController {

  static async generate(req: Request, res: Response): Promise<void> {
    const { text, type } = req.body;

    if (!text || !type) {
      res.status(400).json({ message: 'Text and type are required' });
      return;
    }

    try {
      let prompt = '';
      let schemaDescription = '';

      switch (type) {
        case 'note':
          schemaDescription = `
            Return a JSON object with:
            - content: string (Markdown formatted text summarizing or explaining the input)
          `;
          break;
        case 'single_select_mcq':
        case 'multi_select_mcq':
          schemaDescription = `
            Return a JSON object with:
            - question: string
            - options: array of objects { text: string, isCorrect: boolean }
            - explanation: string (optional, explanation for the correct answer)
            
            Ensure at least one option is correct.
          `;
          break;
        case 'descriptive':
          schemaDescription = `
            Return a JSON object with:
            - question: string
            - answer: string (detailed model answer)
          `;
          break;
        case 'bulk':
          schemaDescription = `
            Return a JSON ARRAY of objects. Each object represents a single-select MCQ and must have this structure:
            {
              question: string,
              options: array of objects { text: string, isCorrect: boolean },
              explanation: string (optional)
            }
            
            IMPORTANT Instructions:
            1. If the input text contains a list of multiple-choice questions (e.g., numbered questions with A, B, C, D options), EXTRACT them exactly as they are.
               - You MUST determine the correct answer yourself based on general knowledge if it is not explicitly marked. set isCorrect: true for the correct option.
            2. If the input text is just informational content (notes, paragraphs), GENERATE 3-5 high-quality MCQs based on it.
            
            Ensure every question has exactly one correct option.
          `;
          break;
        default:
          res.status(400).json({ message: 'Unsupported block type for AI generation' });
          return;
      }

      prompt = `
        You are an expert educational content creator and parser.
        
        Raw Text:
        """
        ${text}
        """

        ${schemaDescription}
        
        Strictly return ONLY the JSON object. Do not include markdown formatting (like \`\`\`json).
      `;

      const completion = await openRouter.chat.send({
        model: 'google/gemma-3-27b-it:free',
        messages: [
          { role: 'user', content: prompt } // Only user messages supported? Or system? Docs showed user.
        ],
      });

      const messageContent = completion?.choices?.[0]?.message?.content;
      
      if (!messageContent) {
        throw new Error('No content generated');
      }

      let content = '';
      if (typeof messageContent === 'string') {
        content = messageContent;
      } else if (Array.isArray(messageContent)) {
        content = messageContent
          .map((part: any) => part.text || '')
          .join('');
      }

      if (!content) {
        throw new Error('Failed to extract text content from response');
      }

      // nuanced parsing to handle potential markdown code blocks if the model ignores instruction
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
      }

      const parsedData = JSON.parse(jsonStr);
      res.json(parsedData);

    } catch (error: any) {
      console.error('AI Generation Error:', error);
      res.status(500).json({ message: 'Failed to generate content', error: error.message });
    }
  }
}
