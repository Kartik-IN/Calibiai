import { Router } from 'express';
import { getProblems } from '../controllers/dsa-problem.controller.js';
import { getProblemVideosController } from '../controllers/dsa-video.controller.js';

const router = Router();

router.get('/', getProblems);
router.get('/:slug/videos', getProblemVideosController);

export default router;
