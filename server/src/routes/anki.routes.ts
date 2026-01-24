import { Router } from 'express';
import { AnkiController } from '@/controllers/anki.controller.ts';
import { authMiddleware } from '@/middleware/auth.middleware.ts';

const router: Router = Router();

router.use(authMiddleware);

router.get('/session', AnkiController.getSession);
router.post('/review', AnkiController.submitReview);

export default router;
