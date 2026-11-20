import assert from 'node:assert/strict';
import { test } from 'node:test';

const { createGetProblemVideos } = await import('../src/controllers/dsa-video.controller.js');

const invoke = async (params, service) => {
  let statusCode;
  let body;
  const res = {
    status(status) { statusCode = status; return this; },
    json(value) { body = value; return this; },
  };
  await createGetProblemVideos(service)({ params }, res, () => {});
  return { statusCode, body };
};

const successService = async slug => ({
  success: true,
  data: {
    problem: { title: 'Two Sum', slug },
    videos: [],
  },
});

test('controller returns successful video response', async () => {
  const result = await invoke({ slug: 'two-sum' }, successService);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    success: true,
    message: 'Problem videos retrieved successfully',
    data: {
      problem: { title: 'Two Sum', slug: 'two-sum' },
      videos: [],
    },
  });
});

test('controller rejects missing or invalid slugs', async () => {
  for (const params of [{}, { slug: '' }, { slug: 'Bad Slug' }, { slug: 'UPPER' }]) {
    const result = await invoke(params, successService);
    assert.equal(result.statusCode, 400);
  }
});

test('controller returns 404 for unknown or unpublished problems', async () => {
  const result = await invoke({ slug: 'two-sum' }, async () => ({
    success: false,
    notFound: true,
    message: 'DSA problem not found',
  }));
  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, { success: false, message: 'DSA problem not found', data: null });
});

test('controller returns 503 for database failures', async () => {
  const result = await invoke({ slug: 'two-sum' }, async () => ({
    success: false,
    message: 'Unable to retrieve problem videos',
  }));
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, {
    success: false,
    message: 'Unable to retrieve problem videos',
    data: null,
  });
});
