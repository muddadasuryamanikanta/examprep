import api from '@/lib/api';

export interface FSRSPreset {
    _id: string;
    name: string;
    description?: string;
    
    userId: string;
    isDefault: boolean;
    isGlobal?: boolean;
    
    // FSRS Parameters
    w: number[];
    requestRetention: number;
    maximumInterval: number;
    enableFuzz: boolean;
    enableShortTerm: boolean;
    
    // Learning Steps
    learningSteps: number[];
    relearningSteps: number[];
    graduatingInterval: number;
    easyInterval: number;
    
    // Meta
    createdAt: string;
    updatedAt: string;
    lastOptimizedAt?: string;
    optimizationSource?: 'manual' | 'optimizer' | 'default';
}

export interface CreatePresetDTO {
    name: string;
    description?: string;
    w?: number[];
    requestRetention?: number;
    maximumInterval?: number;
    enableFuzz?: boolean;
    enableShortTerm?: boolean;
    learningSteps?: number[];
    relearningSteps?: number[];
    graduatingInterval?: number;
    easyInterval?: number;
}

export interface UpdatePresetDTO extends Partial<CreatePresetDTO> {}

export class FSRSPresetService {
    /**
     * Get all presets for current user (includes global)
     */
    static async list(): Promise<FSRSPreset[]> {
        const response = await api.get<FSRSPreset[]>('/fsrs-presets');
        return response.data;
    }

    /**
     * Get a single preset by ID
     */
    static async getById(id: string): Promise<FSRSPreset> {
        const response = await api.get<FSRSPreset>(`/fsrs-presets/${id}`);
        return response.data;
    }

    /**
     * Create a new preset
     */
    static async create(data: CreatePresetDTO): Promise<FSRSPreset> {
        const response = await api.post<FSRSPreset>('/fsrs-presets', data);
        return response.data;
    }

    /**
     * Update an existing preset
     */
    static async update(id: string, data: UpdatePresetDTO): Promise<FSRSPreset> {
        const response = await api.put<FSRSPreset>(`/fsrs-presets/${id}`, data);
        return response.data;
    }

    /**
     * Delete a preset
     */
    static async delete(id: string): Promise<void> {
        await api.delete(`/fsrs-presets/${id}`);
    }

    /**
     * Set a preset as user's default
     */
    static async setAsDefault(id: string): Promise<FSRSPreset> {
        const response = await api.post<FSRSPreset>(`/fsrs-presets/${id}/set-default`);
        return response.data;
    }

    /**
     * Assign preset to a topic
     */
    static async assignToTopic(topicId: string, presetId: string | null): Promise<void> {
        await api.put(`/topics/${topicId}/preset`, { presetId });
    }

    /**
     * Assign preset to a subject
     */
    static async assignToSubject(subjectId: string, presetId: string | null): Promise<void> {
        await api.put(`/subjects/${subjectId}/preset`, { presetId });
    }

    /**
     * Assign preset to a space
     */
    static async assignToSpace(spaceId: string, presetId: string | null): Promise<void> {
        await api.put(`/spaces/${spaceId}/preset`, { presetId });
    }

    /**
     * Get default preset values for creating new presets
     */
    static getDefaultValues(): CreatePresetDTO {
        return {
            name: 'New Preset',
            description: '',
            requestRetention: 0.9,
            maximumInterval: 36500,
            enableFuzz: true,
            enableShortTerm: true,
            learningSteps: [1, 10],
            relearningSteps: [10],
            graduatingInterval: 1,
            easyInterval: 4
        };
    }
}
