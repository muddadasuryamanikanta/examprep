export interface BaseEntity {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Space extends BaseEntity {
  name: string;
  description?: string;
  slug: string;
}

export interface Subject extends BaseEntity {
  title: string;
  spaceId: string;
  position: number;
  slug: string;
}

export interface Topic extends BaseEntity {
  title: string;
  subjectId: string;
  position: number;
  slug: string;
}

export type ContentBlockType = 'note' | 'mcq' | 'descriptive' | 'generic';

export interface BaseContentBlock extends BaseEntity {
  topicId: string;
  position: number;
  kind: ContentBlockType;
}

export interface NoteBlock extends BaseContentBlock {
  kind: 'note';
  content: string; // Markdown or HTML
}

export interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface McqBlock extends BaseContentBlock {
  kind: 'mcq';
  question: string;
  options: McqOption[];
}

export interface DescriptiveBlock extends BaseContentBlock {
  kind: 'descriptive';
  question: string;
  answer?: string; // Model answer or notes
}

export interface GenericBlock extends BaseContentBlock {
  kind: 'generic';
  data: Record<string, unknown>; // Flexible structure for future use
}

export type ContentBlock = NoteBlock | McqBlock | DescriptiveBlock | GenericBlock;
