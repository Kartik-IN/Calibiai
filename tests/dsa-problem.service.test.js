import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

const { getPublishedProblems } = await import('../src/services/dsa-problem.service.js');

const createClient = ({ data = [], count = 0, error = null } = {}) => {
  const calls = [];
  const builder = {
    from(table) {
      calls.push(['from', table]);
      return builder;
    },
    select(fields, options) {
      calls.push(['select', fields, options]);
      return builder;
    },
    eq(field, value) {
      calls.push(['eq', field, value]);
      return builder;
    },
    order(field, options) {
      calls.push(['order', field, options]);
      return builder;
    },
    range(from, to) {
      calls.push(['range', from, to]);
      return builder;
    },
    then(resolve, reject) {
      return Promise.resolve({ data, count, error }).then(resolve, reject);
    },
  };

  return { client: builder, calls };
};

test('service retrieves published problems with exact count', async () => {
  const problem = { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' };
  const { client, calls } = createClient({ data: [problem], count: 1 });

  const result = await getPublishedProblems({}, client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.problems, [problem]);
  assert.deepEqual(result.data.pagination, { page: 1, limit: 20, total: 1, totalPages: 1 });
  assert.deepEqual(calls, [
    ['from', 'dsa_problems'],
    ['select', 'title, slug, description, difficulty, leetcode_url', { count: 'exact' }],
    ['eq', 'is_published', true],
    ['order', 'sort_order', { ascending: true }],
    ['order', 'id', { ascending: true }],
    ['range', 0, 19],
  ]);
});

test('service applies difficulty filtering and pagination', async () => {
  const { client, calls } = createClient({ count: 21 });

  const result = await getPublishedProblems({ page: 2, limit: 10, difficulty: 'Medium' }, client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.pagination, { page: 2, limit: 10, total: 21, totalPages: 3 });
  assert.deepEqual(calls.slice(-2), [
    ['range', 10, 19],
    ['eq', 'difficulty', 'Medium'],
  ]);
});

test('service returns empty results with zero pages', async () => {
  const { client } = createClient();
  const result = await getPublishedProblems({}, client);

  assert.deepEqual(result.data.problems, []);
  assert.equal(result.data.pagination.total, 0);
  assert.equal(result.data.pagination.totalPages, 0);
});

test('service handles Supabase errors safely', async () => {
  const { client } = createClient({ error: { code: 'PGRST000', message: 'internal detail' } });
  const result = await getPublishedProblems({}, client);

  assert.deepEqual(result, {
    success: false,
    message: 'Unable to retrieve DSA problems',
  });
});
