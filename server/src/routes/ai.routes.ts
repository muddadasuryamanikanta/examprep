
import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router: Router = Router();

router.use(authMiddleware);

router.post('/generate', AiController.generate);

export default router;
