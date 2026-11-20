import { Router } from 'express';
import {
  getProblemProgress,
  getProgress,
  updateProgress,
} from '../controllers/dsa-progress.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateUser, getProgress);
router.get('/:slug', authenticateUser, getProblemProgress);
router.put('/:slug', authenticateUser, updateProgress);

export default router;
