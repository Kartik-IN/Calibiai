import { getPublishedProblems } from '../services/dsa-problem.service.js';

const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const MAX_LIMIT = 100;

const failure = (res, message) => res.status(400).json({
  success: false,
  message,
  data: null,
});

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  return typeof value === 'string' && POSITIVE_INTEGER.test(value)
    ? Number(value)
    : null;
};

export const createGetProblems = (service = getPublishedProblems) => async (req, res, next) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 20);
  const { difficulty } = req.query;

  if (page === null) {
    return failure(res, 'page must be a positive integer');
  }

  if (limit === null || limit > MAX_LIMIT) {
    return failure(res, 'limit must be a positive integer no greater than 100');
  }

  if (difficulty !== undefined && !ALLOWED_DIFFICULTIES.has(difficulty)) {
    return failure(res, 'difficulty must be Easy, Medium, or Hard');
  }

  try {
    const result = await service({ page, limit, difficulty });

    if (!result.success) {
      return res.status(503).json({
        success: false,
        message: result.message,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'DSA problems retrieved successfully',
      data: result.data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getProblems = createGetProblems();
