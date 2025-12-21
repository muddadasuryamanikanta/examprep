import { create } from 'zustand';
import api from '../lib/api';
import { type Subject, type Topic, type ContentBlock, type ContentBlockType } from '../types/domain';

interface ContentState {
  subjects: Subject[];
  topics: Topic[];
  blocks: ContentBlock[];
  
  currentSubject: Subject | null;
  currentTopic: Topic | null;
  
  isLoading: boolean;
  error: string | null;

  // Subjects
  fetchSubjects: (spaceId: string) => Promise<void>;
  fetchSubject: (subjectId: string) => Promise<void>;
  createSubject: (spaceId: string, title: string) => Promise<void>;
  updateSubject: (id: string, title: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  setCurrentSubject: (subject: Subject | null) => void;

  // Topics
  fetchTopics: (subjectId: string) => Promise<void>;
  createTopic: (subjectId: string, title: string) => Promise<void>;
  updateTopic: (id: string, title: string) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  setCurrentTopic: (topic: Topic | null) => void;

  // Blocks
  fetchBlocks: (topicId: string) => Promise<void>;
  addBlock: (topicId: string, type: ContentBlockType, initialData?: Partial<ContentBlock>) => Promise<ContentBlock>;
  updateBlock: (id: string, updates: Partial<ContentBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  setBlocks: (blocks: ContentBlock[]) => void; // For optimistic updates
}

export const useContentStore = create<ContentState>((set, get) => ({
  subjects: [],
  topics: [],
  blocks: [],
  currentSubject: null,
  currentTopic: null,
  isLoading: false,
  error: null,

  // --- Subjects ---
  fetchSubjects: async (spaceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Subject[]>(`/spaces/${spaceId}/subjects`);
      set({ subjects: res.data, isLoading: false });
    } catch (error) {
      console.error('Fetch subjects error:', error);
      set({ error: 'Failed to fetch subjects', isLoading: false });
    }
  },

  fetchSubject: async (subjectId) => {
    // If we already have it in list, use it? No, fetch fresh to be safe/simple or if we navigated directly
    // But we might want to set loading?
    // Let's just fetch it.
    try {
      const res = await api.get<Subject>(`/subjects/${subjectId}`);
      set({ currentSubject: res.data });
    } catch (error) {
      console.error('Fetch subject error:', error);
      // Don't necessarily set global error which blanks screen?
    }
  },

  createSubject: async (spaceId, title) => {
    try {
      await api.post('/subjects', { spaceId, title });
      await get().fetchSubjects(spaceId);
    } catch (error) {
      console.error('Create subject error:', error);
      throw error;
    }
  },

  updateSubject: async (id, title) => {
    try {
      await api.put(`/subjects/${id}`, { title });
      // Optimistic update locally if possible, but simplest is reliable fetch
      // We need spaceId to refetch... store assumes we work in context. 
      // Ideally backend returns the updated object. 
      // For now, let's update local state manually to avoid needing spaceId arg
      set(state => ({
        subjects: state.subjects.map(s => s._id === id ? { ...s, title } : s),
        currentSubject: state.currentSubject?._id === id ? { ...state.currentSubject, title } : state.currentSubject
      }));
    } catch (error) {
      console.error('Update subject error:', error);
      throw error;
    }
  },

  deleteSubject: async (id) => {
    try {
      await api.delete(`/subjects/${id}`);
      set(state => ({
        subjects: state.subjects.filter(s => s._id !== id),
        currentSubject: state.currentSubject?._id === id ? null : state.currentSubject
      }));
    } catch (error) {
       console.error('Delete subject error:', error);
       throw error;
    }
  },
  
  setCurrentSubject: (subject) => set({ currentSubject: subject }),

  // --- Topics ---
  fetchTopics: async (subjectId) => {
     set({ isLoading: true, error: null });
     try {
       const res = await api.get<Topic[]>(`/subjects/${subjectId}/topics`);
       set({ topics: res.data, isLoading: false });
     } catch (error) {
       console.error('Fetch topics error:', error);
       set({ error: 'Failed to fetch topics', isLoading: false });
     }
  },

  createTopic: async (subjectId, title) => {
    try {
      await api.post('/topics', { subjectId, title });
      await get().fetchTopics(subjectId);
    } catch (error) {
      console.error('Create topic error:', error);
      throw error;
    }
  },

  updateTopic: async (id, title) => {
    try {
      await api.put(`/topics/${id}`, { title });
      set(state => ({
        topics: state.topics.map(t => t._id === id ? { ...t, title } : t),
        currentTopic: state.currentTopic?._id === id ? { ...state.currentTopic, title } : state.currentTopic
      }));
    } catch (error) {
       console.error('Update topic error:', error);
       throw error;
    }
  },

  deleteTopic: async (id) => {
     try {
       await api.delete(`/topics/${id}`);
       set(state => ({
         topics: state.topics.filter(t => t._id !== id),
         currentTopic: state.currentTopic?._id === id ? null : state.currentTopic
       }));
     } catch (error) {
       console.error('Delete topic error:', error);
       throw error;
     }
  },
  
  setCurrentTopic: (topic) => set({ currentTopic: topic }),

  // --- Blocks ---
  fetchBlocks: async (topicId) => {
    // Silent load if we already have some blocks ? No, safe to show loading
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<ContentBlock[]>(`/topics/${topicId}/content`);
      set({ blocks: res.data, isLoading: false });
    } catch (error) {
      console.error('Fetch blocks error:', error);
      set({ error: 'Failed to fetch blocks', isLoading: false });
    }
  },

  addBlock: async (topicId, type, initialData) => {
    try {
      const defaultBlock = {
        topicId,
        kind: type,
        content: type === 'note' ? 'New note...' : undefined,
        question: type !== 'note' && type !== 'generic' ? 'New Question' : undefined,
        options: (type === 'single_select_mcq' || type === 'multi_select_mcq') ? [{ id: '1', text: 'Option A', isCorrect: false }] : undefined,
      };
      
      // Override defaults with initialData if provided
      const payload = { ...defaultBlock, ...initialData };

      const res = await api.post<ContentBlock>('/content', payload);
      const newBlock = res.data;
      
      // Append to local state
      set(state => ({ blocks: [...state.blocks, newBlock] }));
      return newBlock;
    } catch (error) {
      console.error('Add block error:', error);
      throw error;
    }
  },

  updateBlock: async (id, updates) => {
    // Optimistic
    const previousBlocks = get().blocks;
    set({ blocks: previousBlocks.map(b => b._id === id ? { ...b, ...updates } as ContentBlock : b) });

    try {
      await api.put(`/content/${id}`, updates);
    } catch (error) {
      console.error('Update block error:', error);
      set({ blocks: previousBlocks }); // Revert
      throw error; // Let UI handle notification if needed
    }
  },

  deleteBlock: async (id) => {
    const previousBlocks = get().blocks;
    set({ blocks: previousBlocks.filter(b => b._id !== id) });
    
    try {
      await api.delete(`/content/${id}`);
    } catch (error) {
       console.error('Delete block error:', error);
       set({ blocks: previousBlocks });
       throw error;
    }
  },
  
  setBlocks: (blocks) => set({ blocks }),
}));
