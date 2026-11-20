import { createSupabaseUserClient } from '../config/supabase-user.js';
import {
  getStudentProblemProgress,
  getStudentProgress,
  upsertStudentProblemProgress,
} from '../services/dsa-progress.service.js';

const failure = (res, status, message) => res.status(status).json({ success: false, message, data: null });
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const clientFor = req => createSupabaseUserClient(req.accessToken);

export const createProgressController = (service = {
  getStudentProgress,
  getStudentProblemProgress,
  upsertStudentProblemProgress,
}) => ({
  getAll: async (req, res, next) => {
    try {
      const result = await service.getStudentProgress(req.user.id, clientFor(req));
      if (!result.success) return failure(res, 503, result.message);
      return res.status(200).json({ success: true, message: 'Progress retrieved successfully', data: result.data });
    } catch (error) { return next(error); }
  },

  getOne: async (req, res, next) => {
    if (typeof req.params.slug !== 'string' || !SLUG.test(req.params.slug)) {
      return failure(res, 400, 'A valid problem slug is required');
    }

    try {
      const result = await service.getStudentProblemProgress(req.user.id, req.params.slug, clientFor(req));
      if (result.notFound) return failure(res, 404, 'DSA problem not found');
      if (!result.success) return failure(res, 503, result.message);
      return res.status(200).json({ success: true, message: 'Problem progress retrieved successfully', data: result.data });
    } catch (error) { return next(error); }
  },

  update: async (req, res, next) => {
    if (typeof req.params.slug !== 'string' || !SLUG.test(req.params.slug)) {
      return failure(res, 400, 'A valid problem slug is required');
    }

    try {
      const result = await service.upsertStudentProblemProgress(req.user.id, req.params.slug, req.body?.status, clientFor(req));
      if (result.invalidStatus) return failure(res, 400, result.message);
      if (result.notFound) return failure(res, 404, 'DSA problem not found');
      if (!result.success) return failure(res, 503, result.message);
      return res.status(200).json({ success: true, message: 'Problem progress updated successfully', data: result.data });
    } catch (error) { return next(error); }
  },
});

const defaultController = createProgressController();
export const getProgress = defaultController.getAll;
export const getProblemProgress = defaultController.getOne;
export const updateProgress = defaultController.update;
