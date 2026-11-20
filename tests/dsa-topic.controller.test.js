import assert from 'node:assert/strict';
import { test } from 'node:test';

const { createTopicController } = await import('../src/controllers/dsa-topic.controller.js');

const invoke = async (method, query, params, service) => {
  let statusCode;
  let body;
  const res = {
    status(status) { statusCode = status; return this; },
    json(value) { body = value; return this; },
  };
  await createTopicController(service)[method]({ query, params }, res, () => {});
  return { statusCode, body };
};

const service = {
  getTopics: async filters => ({ success: true, data: { topics: [], pagination: { ...filters, total: 0, totalPages: 0 } } }),
  getTopicProblems: async filters => ({
    success: true,
    data: {
      topic: { name: 'Arrays', slug: filters.slug, description: null },
      problems: [],
      pagination: { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 },
    },
  }),
};

test('topic controller applies default and valid pagination', async () => {
  const defaults = await invoke('getTopics', {}, {}, service);
  assert.equal(defaults.statusCode, 200);
  assert.deepEqual(defaults.body.data.pagination, { page: 1, limit: 20, total: 0, totalPages: 0 });

  const valid = await invoke('getTopics', { page: '2', limit: '100' }, {}, service);
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.body.data.pagination.page, 2);
  assert.equal(valid.body.data.pagination.limit, 100);
});

test('topic controller rejects invalid pagination', async () => {
  for (const query of [{ page: '0' }, { page: 'x' }, { limit: '0' }, { limit: '101' }]) {
    const result = await invoke('getTopics', query, {}, service);
    assert.equal(result.statusCode, 400);
  }
});

test('topic problems controller validates slug and pagination', async () => {
  for (const params of [{ slug: '' }, { slug: 'Bad Slug' }, { slug: 'UPPER' }]) {
    assert.equal((await invoke('getTopicProblems', {}, params, service)).statusCode, 400);
  }
  assert.equal((await invoke('getTopicProblems', { limit: '101' }, { slug: 'arrays' }, service)).statusCode, 400);
});

test('topic problems controller returns the required structure', async () => {
  const result = await invoke('getTopicProblems', {}, { slug: 'arrays' }, service);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(Object.keys(result.body.data.topic).sort(), ['description', 'name', 'slug']);
  assert.deepEqual(result.body.data.pagination, { page: 1, limit: 20, total: 0, totalPages: 0 });
});

test('topic problems controller returns 404 for unknown topic', async () => {
  const result = await invoke('getTopicProblems', {}, { slug: 'missing' }, {
    getTopics: service.getTopics,
    getTopicProblems: async () => ({ success: false, notFound: true, message: 'DSA topic not found' }),
  });
  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, { success: false, message: 'DSA topic not found', data: null });
});

test('topic controllers return 503 for database failures', async () => {
  const failed = { getTopics: async () => ({ success: false, message: 'Unable to retrieve DSA topics' }), getTopicProblems: async () => ({ success: false, message: 'Unable to retrieve topic problems' }) };
  assert.equal((await invoke('getTopics', {}, {}, failed)).statusCode, 503);
  assert.equal((await invoke('getTopicProblems', {}, { slug: 'arrays' }, failed)).statusCode, 503);
});
