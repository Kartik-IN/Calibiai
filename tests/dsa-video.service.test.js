import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

const { getProblemVideos } = await import('../src/services/dsa-video.service.js');

const createClient = ({ problem, problemError = null, videos = [], videoError = null } = {}) => {
  const calls = [];
  const resultFor = table => (table === 'dsa_problems'
    ? { data: problem, error: problemError }
    : { data: videos, error: videoError });
  const builderFor = table => {
    const builder = {
      select(fields) { calls.push([table, 'select', fields]); return builder; },
      eq(field, value) { calls.push([table, 'eq', field, value]); return builder; },
      order(field, options) { calls.push([table, 'order', field, options]); return builder; },
      maybeSingle() { calls.push([table, 'maybeSingle']); return Promise.resolve(resultFor(table)); },
      then(resolve, reject) { return Promise.resolve(resultFor(table)).then(resolve, reject); },
    };
    return builder;
  };

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table]);
        return builderFor(table);
      },
    },
  };
};

const publishedProblem = { id: 'problem-1', title: 'Two Sum', slug: 'two-sum' };
const videos = [
  { video_id: 'video-1', title: 'Explanation', language: 'English', channel_name: 'Channel', sort_order: 1 },
  { video_id: 'video-2', title: 'Another Explanation', language: 'Hindi', channel_name: 'Other', sort_order: 2 },
];

test('service retrieves multiple videos for a published problem', async () => {
  const { client } = createClient({ problem: publishedProblem, videos });
  const result = await getProblemVideos('two-sum', client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.problem, { title: 'Two Sum', slug: 'two-sum' });
  assert.deepEqual(result.data.videos, videos);
  assert.equal('id' in result.data.problem, false);
  assert.equal('id' in result.data.videos[0], false);
});

test('service returns an empty list when a published problem has no videos', async () => {
  const { client } = createClient({ problem: publishedProblem, videos: [] });
  const result = await getProblemVideos('two-sum', client);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.videos, []);
});

test('service resolves unknown and unpublished problems as not found', async () => {
  for (const problem of [null, null]) {
    const { client } = createClient({ problem });
    const result = await getProblemVideos('two-sum', client);
    assert.deepEqual(result, { success: false, notFound: true, message: 'DSA problem not found' });
  }
});

test('service selects published problem fields and applies published filter', async () => {
  const { client, calls } = createClient({ problem: publishedProblem });
  await getProblemVideos('two-sum', client);

  assert.deepEqual(calls.slice(0, 5), [
    ['from', 'dsa_problems'],
    ['dsa_problems', 'select', 'id, title, slug'],
    ['dsa_problems', 'eq', 'slug', 'two-sum'],
    ['dsa_problems', 'eq', 'is_published', true],
    ['dsa_problems', 'maybeSingle'],
  ]);
});

test('service selects video fields, uses the problem ID, and orders deterministically', async () => {
  const { client, calls } = createClient({ problem: publishedProblem, videos });
  await getProblemVideos('two-sum', client);

  assert.deepEqual(calls.slice(5), [
    ['from', 'problem_videos'],
    ['problem_videos', 'select', 'video_id, title, language, channel_name, sort_order'],
    ['problem_videos', 'eq', 'problem_id', 'problem-1'],
    ['problem_videos', 'order', 'sort_order', { ascending: true }],
    ['problem_videos', 'order', 'id', { ascending: true }],
  ]);
});

test('service handles problem and video lookup failures safely', async () => {
  const problemFailure = createClient({ problemError: { code: 'DB_ERROR' } });
  assert.deepEqual(await getProblemVideos('two-sum', problemFailure.client), {
    success: false,
    message: 'Unable to retrieve DSA problem',
  });

  const videoFailure = createClient({ problem: publishedProblem, videoError: { code: 'DB_ERROR' } });
  assert.deepEqual(await getProblemVideos('two-sum', videoFailure.client), {
    success: false,
    message: 'Unable to retrieve problem videos',
  });
});
