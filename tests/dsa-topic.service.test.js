import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

const { getTopics, getTopicProblems } = await import('../src/services/dsa-topic.service.js');

const builderFor = (result, calls, table) => {
  const builder = {
    select(fields, options) { calls.push([table, 'select', fields, options]); return builder; },
    eq(field, value) { calls.push([table, 'eq', field, value]); return builder; },
    in(field, values) { calls.push([table, 'in', field, values]); return builder; },
    order(field, options) { calls.push([table, 'order', field, options]); return builder; },
    range(from, to) { calls.push([table, 'range', from, to]); return builder; },
    maybeSingle() { calls.push([table, 'maybeSingle']); return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return builder;
};

const createClient = results => {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table]);
        return builderFor(results[table], calls, table);
      },
    },
  };
};

test('topic service lists topics with exact count, pagination, and stable ordering', async () => {
  const { client, calls } = createClient({
    dsa_topics: { data: [{ name: 'Arrays', slug: 'arrays', description: null }], count: 1, error: null },
  });
  const result = await getTopics({ page: 2, limit: 10 }, client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.pagination, { page: 2, limit: 10, total: 1, totalPages: 1 });
  assert.deepEqual(calls, [
    ['from', 'dsa_topics'],
    ['dsa_topics', 'select', 'name, slug, description', { count: 'exact' }],
    ['dsa_topics', 'order', 'name', { ascending: true }],
    ['dsa_topics', 'order', 'id', { ascending: true }],
    ['dsa_topics', 'range', 10, 19],
  ]);
});

test('topic service handles empty topics and database errors', async () => {
  const empty = createClient({ dsa_topics: { data: [], count: 0, error: null } });
  const emptyResult = await getTopics({}, empty.client);
  assert.deepEqual(emptyResult.data.topics, []);
  assert.equal(emptyResult.data.pagination.totalPages, 0);

  const failed = createClient({ dsa_topics: { data: null, count: null, error: { code: 'DB_ERROR' } } });
  assert.deepEqual(await getTopics({}, failed.client), {
    success: false,
    message: 'Unable to retrieve DSA topics',
  });
});

test('topic problems resolves relationships and returns published-only fields', async () => {
  const problem = { title: 'Two Sum', slug: 'two-sum', description: null, difficulty: 'Easy', leetcode_url: null };
  const { client, calls } = createClient({
    dsa_topics: { data: { id: 'topic-1', name: 'Arrays', slug: 'arrays', description: 'Array-based problems' }, error: null },
    problem_topics: { data: [{ problem_id: 'problem-1' }], error: null },
    dsa_problems: { data: [problem], count: 1, error: null },
  });

  const result = await getTopicProblems({ slug: 'arrays', page: 2, limit: 10 }, client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.topic, {
    name: 'Arrays',
    slug: 'arrays',
    description: 'Array-based problems',
  });
  assert.deepEqual(result.data.problems, [problem]);
  assert.deepEqual(calls, [
    ['from', 'dsa_topics'],
    ['dsa_topics', 'select', 'id, name, slug, description', undefined],
    ['dsa_topics', 'eq', 'slug', 'arrays'],
    ['dsa_topics', 'maybeSingle'],
    ['from', 'problem_topics'],
    ['problem_topics', 'select', 'problem_id', undefined],
    ['problem_topics', 'eq', 'topic_id', 'topic-1'],
    ['from', 'dsa_problems'],
    ['dsa_problems', 'select', 'title, slug, description, difficulty, leetcode_url', { count: 'exact' }],
    ['dsa_problems', 'eq', 'is_published', true],
    ['dsa_problems', 'in', 'id', ['problem-1']],
    ['dsa_problems', 'order', 'sort_order', { ascending: true }],
    ['dsa_problems', 'order', 'id', { ascending: true }],
    ['dsa_problems', 'range', 10, 19],
  ]);
});

test('topic problems handles unknown topics and empty relationships without in([])', async () => {
  const unknown = createClient({ dsa_topics: { data: null, error: null } });
  const unknownResult = await getTopicProblems({ slug: 'unknown' }, unknown.client);
  assert.deepEqual(unknownResult, { success: false, notFound: true, message: 'DSA topic not found' });

  const empty = createClient({
    dsa_topics: { data: { id: 'topic-1', name: 'Arrays', slug: 'arrays', description: null }, error: null },
    problem_topics: { data: [], error: null },
  });
  const emptyResult = await getTopicProblems({ slug: 'arrays' }, empty.client);
  assert.equal(emptyResult.success, true);
  assert.deepEqual(emptyResult.data.problems, []);
  assert.equal(emptyResult.data.pagination.total, 0);
  assert.equal(empty.calls.some(call => call[1] === 'in'), false);
});

test('topic problems handles unpublished-only results and query errors', async () => {
  const noPublished = createClient({
    dsa_topics: { data: { id: 'topic-1', name: 'Arrays', slug: 'arrays', description: 'Array-based problems' }, error: null },
    problem_topics: { data: [{ problem_id: 'problem-1' }], error: null },
    dsa_problems: { data: [], count: 0, error: null },
  });

  const noPublishedResult = await getTopicProblems({ slug: 'arrays', page: 2, limit: 10 }, noPublished.client);
  assert.equal(noPublishedResult.success, true);
  assert.deepEqual(noPublishedResult.data.topic, {
    name: 'Arrays',
    slug: 'arrays',
    description: 'Array-based problems',
  });
  assert.deepEqual(noPublishedResult.data.problems, []);
  assert.equal(noPublishedResult.data.pagination.total, 0);
  assert.equal(noPublishedResult.data.pagination.totalPages, 0);
  assert.equal(noPublishedResult.data.pagination.page, 2);
  assert.equal(noPublishedResult.data.pagination.limit, 10);
  assert.deepEqual(noPublished.calls.find(call => call[0] === 'dsa_problems' && call[1] === 'eq'), [
    'dsa_problems',
    'eq',
    'is_published',
    true,
  ]);

  for (const [stage, results, message] of [
    ['topic', { dsa_topics: { data: null, error: { code: 'DB_ERROR' } } }, 'Unable to retrieve DSA topic'],
    ['relationship', {
      dsa_topics: { data: { id: 'topic-1', name: 'Arrays', slug: 'arrays', description: null }, error: null },
      problem_topics: { data: null, error: { code: 'DB_ERROR' } },
    }, 'Unable to retrieve topic problems'],
    ['problem', {
      dsa_topics: { data: { id: 'topic-1', name: 'Arrays', slug: 'arrays', description: null }, error: null },
      problem_topics: { data: [{ problem_id: 'problem-1' }], error: null },
      dsa_problems: { data: null, count: null, error: { code: 'DB_ERROR' } },
    }, 'Unable to retrieve topic problems'],
  ]) {
    const { client } = createClient(results);
    const result = await getTopicProblems({ slug: 'arrays' }, client);
    assert.equal(result.message, message, stage);
  }
});

test('topic problems preserves exact count across multiple pages', async () => {
  const pageProblems = Array.from({ length: 10 }, (_, index) => ({
    title: `Problem ${index + 11}`,
    slug: `problem-${index + 11}`,
    description: null,
    difficulty: 'Medium',
    leetcode_url: null,
  }));
  const { client, calls } = createClient({
    dsa_topics: { data: { id: 'topic-1', name: 'Arrays', slug: 'arrays', description: null }, error: null },
    problem_topics: { data: [{ problem_id: 'problem-1' }, { problem_id: 'problem-2' }], error: null },
    dsa_problems: { data: pageProblems, count: 25, error: null },
  });

  const result = await getTopicProblems({ slug: 'arrays', page: 2, limit: 10 }, client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.problems, pageProblems);
  assert.deepEqual(result.data.pagination, {
    page: 2,
    limit: 10,
    total: 25,
    totalPages: 3,
  });
  assert.deepEqual(calls.find(call => call[0] === 'dsa_problems' && call[1] === 'select'), [
    'dsa_problems',
    'select',
    'title, slug, description, difficulty, leetcode_url',
    { count: 'exact' },
  ]);
  assert.deepEqual(calls.find(call => call[0] === 'dsa_problems' && call[1] === 'eq'), [
    'dsa_problems',
    'eq',
    'is_published',
    true,
  ]);
  assert.deepEqual(calls.find(call => call[0] === 'dsa_problems' && call[1] === 'range'), [
    'dsa_problems',
    'range',
    10,
    19,
  ]);
});
