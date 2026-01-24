import { Router } from 'express';
import { getTestsDueToday } from '@/controllers/dashboard.controller.js';
import { authMiddleware as protect } from '@/middleware/auth.middleware.js';

const router: Router = Router();

router.get('/tests-due-today', protect, getTestsDueToday);

export default router;
