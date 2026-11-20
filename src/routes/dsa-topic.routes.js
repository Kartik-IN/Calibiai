import { Router } from 'express';
import {
  getTopicProblemsController,
  getTopicsController,
} from '../controllers/dsa-topic.controller.js';

const router = Router();

router.get('/', getTopicsController);
router.get('/:slug/problems', getTopicProblemsController);

export default router;
