import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

const {
  getStudentProgress,
  getStudentProblemProgress,
  upsertStudentProblemProgress,
} = await import('../src/services/dsa-progress.service.js');

const createClient = results => {
  const calls = [];
  const builderFor = table => {
    const result = results[table] ?? { data: [], error: null };
    const builder = {
      select(fields) { calls.push([table, 'select', fields]); return builder; },
      eq(field, value) { calls.push([table, 'eq', field, value]); return builder; },
      order(field, options) { calls.push([table, 'order', field, options]); return builder; },
      upsert(row, options) { calls.push([table, 'upsert', row, options]); return builder; },
      maybeSingle() { calls.push([table, 'maybeSingle']); return Promise.resolve(result); },
      single() { calls.push([table, 'single']); return Promise.resolve(result); },
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    };
    return builder;
  };
  return {
    calls,
    client: { from(table) { calls.push(['from', table]); return builderFor(table); } },
  };
};

const problem = { id: 'problem-1', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' };

test('empty student progress returns an empty array filtered by user', async () => {
  const { client, calls } = createClient({ 'user_problem_progress': { data: [], error: null } });
  const result = await getStudentProgress('user-1', client);
  assert.deepEqual(result.data.progress, []);
  assert.deepEqual(calls.find(call => call[0] === 'user_problem_progress' && call[1] === 'eq'), [
    'user_problem_progress', 'eq', 'user_id', 'user-1',
  ]);
});

test('student progress maps published problem details only', async () => {
  const { client, calls } = createClient({
    user_problem_progress: {
      data: [{ status: 'Attempted', created_at: 'created', updated_at: 'updated', dsa_problems: { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' } }],
      error: null,
    },
  });
  const result = await getStudentProgress('user-1', client);
  assert.deepEqual(result.data.progress[0].problem, { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' });
  assert.deepEqual(calls.filter(call => call[0] === 'user_problem_progress' && call[1] === 'eq').at(-1), [
    'user_problem_progress', 'eq', 'dsa_problems.is_published', true,
  ]);
});

test('missing single-problem progress derives Not Started without inserting', async () => {
  const { client, calls } = createClient({
    dsa_problems: { data: problem, error: null },
    user_problem_progress: { data: null, error: null },
  });
  const result = await getStudentProblemProgress('user-1', 'two-sum', client);
  assert.deepEqual(result.data.progress, { status: 'Not Started' });
  assert.equal(calls.some(call => call[1] === 'upsert'), false);
});

test('unknown or unpublished problem is not found', async () => {
  const { client } = createClient({ dsa_problems: { data: null, error: null } });
  const result = await getStudentProblemProgress('user-1', 'missing', client);
  assert.equal(result.notFound, true);
});

test('status upsert uses verified user, problem, and conflict target', async () => {
  const { client, calls } = createClient({
    dsa_problems: { data: problem, error: null },
    user_problem_progress: { data: { status: 'Completed', created_at: 'c', updated_at: 'u' }, error: null },
  });
  const result = await upsertStudentProblemProgress('user-1', 'two-sum', 'Completed', client);
  assert.equal(result.success, true);
  assert.deepEqual(calls.find(call => call[1] === 'upsert'), [
    'user_problem_progress',
    'upsert',
    { user_id: 'user-1', problem_id: 'problem-1', status: 'Completed' },
    { onConflict: 'user_id,problem_id' },
  ]);
});

test('invalid statuses are rejected without database writes', async () => {
  const { client, calls } = createClient();
  const result = await upsertStudentProblemProgress('user-1', 'two-sum', 'Not Started', client);
  assert.equal(result.invalidStatus, true);
  assert.equal(calls.length, 0);
});

test('database failures return safe results', async () => {
  const problemFailure = createClient({ dsa_problems: { data: null, error: { code: 'DB_ERROR' } } });
  assert.equal((await getStudentProblemProgress('user-1', 'two-sum', problemFailure.client)).success, false);

  const progressFailure = createClient({
    dsa_problems: { data: problem, error: null },
    user_problem_progress: { data: null, error: { code: 'DB_ERROR' } },
  });
  assert.equal((await getStudentProblemProgress('user-1', 'two-sum', progressFailure.client)).success, false);

  const upsertFailure = createClient({
    dsa_problems: { data: problem, error: null },
    user_problem_progress: { data: null, error: { code: 'DB_ERROR' } },
  });
  assert.equal((await upsertStudentProblemProgress('user-1', 'two-sum', 'Attempted', upsertFailure.client)).success, false);
});
