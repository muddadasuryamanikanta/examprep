export interface BaseEntity {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Space extends BaseEntity {
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  subjectCount?: number;
}

export interface Subject extends BaseEntity {
  title: string;
  spaceId: string;
  position: number;
  slug: string;
  topicCount?: number;
  questionCount?: number;
  icon?: string;
}

export interface Topic extends BaseEntity {
  title: string;
  subjectId: string;
  position: number;
  slug: string;
  icon?: string;
}

export type ContentBlockType = 'note' | 'single_select_mcq' | 'multi_select_mcq' | 'descriptive' | 'generic';

export interface BaseContentBlock extends BaseEntity {
  topicId: string;
  position: number;
  kind: ContentBlockType;
  explanation?: string;
  notes?: string;
  tags?: string[];
  group?: string;
  hints?: string[];
}

export interface NoteBlock extends BaseContentBlock {
  kind: 'note';
  content: string;
}

export interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface SingleSelectMcqBlock extends BaseContentBlock {
  kind: 'single_select_mcq';
  question: string;
  options: McqOption[];
}

export interface MultiSelectMcqBlock extends BaseContentBlock {
  kind: 'multi_select_mcq';
  question: string;
  options: McqOption[];
}

export interface DescriptiveBlock extends BaseContentBlock {
  kind: 'descriptive';
  question: string;
  answer?: string;
}

export interface GenericBlock extends BaseContentBlock {
  kind: 'generic';
  data: Record<string, unknown>;
}



export type ContentBlock = NoteBlock | SingleSelectMcqBlock | MultiSelectMcqBlock | DescriptiveBlock | GenericBlock;

export interface TestQuestion {
  blockId: string;
  blockSnapshot: ContentBlock;
  userAnswer?: unknown;
}

export interface Test extends BaseEntity {
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
  startTime?: string;
  endTime?: string;
  questions: TestQuestion[];
  score: number;
  totalMarks: number;
  config: {
    questionCount: number;
    duration: number; // in minutes
  };
  warnings?: Array<{ timestamp: Date; reason: string }>;
}
