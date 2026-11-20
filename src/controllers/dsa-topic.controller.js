import { getTopicProblems, getTopics } from '../services/dsa-topic.service.js';

const MAX_LIMIT = 100;
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const failure = (res, status, message) => res.status(status).json({
  success: false,
  message,
  data: null,
});

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;
  return typeof value === 'string' && POSITIVE_INTEGER.test(value) ? Number(value) : null;
};

const paginationParams = (query) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 20);
  if (page === null) return { error: 'page must be a positive integer' };
  if (limit === null || limit > MAX_LIMIT) {
    return { error: 'limit must be a positive integer no greater than 100' };
  }
  return { page, limit };
};

export const createTopicController = (service = { getTopics, getTopicProblems }) => ({
  getTopics: async (req, res, next) => {
    const params = paginationParams(req.query);
    if (params.error) return failure(res, 400, params.error);

    try {
      const result = await service.getTopics(params);
      if (!result.success) return failure(res, 503, result.message);
      return res.status(200).json({
        success: true,
        message: 'DSA topics retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      return next(error);
    }
  },

  getTopicProblems: async (req, res, next) => {
    const { slug } = req.params;
    if (typeof slug !== 'string' || !SLUG.test(slug)) {
      return failure(res, 400, 'A valid topic slug is required');
    }

    const params = paginationParams(req.query);
    if (params.error) return failure(res, 400, params.error);

    try {
      const result = await service.getTopicProblems({ slug, ...params });
      if (result.notFound) return failure(res, 404, 'DSA topic not found');
      if (!result.success) return failure(res, 503, result.message);
      return res.status(200).json({
        success: true,
        message: 'Topic problems retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      return next(error);
    }
  },
});

const defaultController = createTopicController();
export const getTopicsController = defaultController.getTopics;
export const getTopicProblemsController = defaultController.getTopicProblems;
