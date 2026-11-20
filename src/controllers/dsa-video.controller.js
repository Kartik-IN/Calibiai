import { getProblemVideos } from '../services/dsa-video.service.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const failure = (res, status, message) => res.status(status).json({
  success: false,
  message,
  data: null,
});

export const createGetProblemVideos = (service = getProblemVideos) => async (req, res, next) => {
  const { slug } = req.params;

  if (typeof slug !== 'string' || !SLUG.test(slug)) {
    return failure(res, 400, 'A valid problem slug is required');
  }

  try {
    const result = await service(slug);

    if (result.notFound) {
      return failure(res, 404, 'DSA problem not found');
    }

    if (!result.success) {
      return failure(res, 503, result.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Problem videos retrieved successfully',
      data: result.data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getProblemVideosController = createGetProblemVideos();
