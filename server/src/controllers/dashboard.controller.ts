import type { Request, Response, NextFunction } from 'express';
import DashboardService from '../services/dashboard.service.js';

// Helper to parse array from query (e.g. ?spaceIds=id1,id2 or ?spaceIds[]=id1&spaceIds[]=id2)
const parseArray = (input: any): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(String);
    if (typeof input === 'string') return input.split(',').map(s => s.trim());
    return [];
};

export const getTestsDueToday = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any)?._id; // Assumes auth middleware populates req.user

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const filters = {
            spaceIds: parseArray(req.query.spaceIds),
            subjectIds: parseArray(req.query.subjectIds),
            topicIds: parseArray(req.query.topicIds)
        };

        const result = await DashboardService.getTestsDueToday(userId.toString(), filters, { page, limit });

        res.status(200).json(result);

    } catch (error) {
        console.error('Dashboard aggregation error:', error);
        next(error);
    }
};
