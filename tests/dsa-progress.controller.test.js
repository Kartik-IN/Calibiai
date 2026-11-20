import assert from 'node:assert/strict';
import { test } from 'node:test';

const { createProgressController } = await import('../src/controllers/dsa-progress.controller.js');

const invoke = async (method, req, service) => {
  let statusCode;
  let body;
  const res = { status(code) { statusCode = code; return this; }, json(value) { body = value; return this; } };
  await createProgressController(service)[method](req, res, () => {});
  return { statusCode, body };
};

const service = {
  getStudentProgress: async () => ({ success: true, data: { progress: [] } }),
  getStudentProblemProgress: async () => ({ success: true, data: { problem: { title: 'Two Sum' }, progress: { status: 'Not Started' } } }),
  upsertStudentProblemProgress: async (userId, slug, status) => ({ success: true, data: { userId, slug, progress: { status } } }),
};

const req = (overrides = {}) => ({ user: { id: 'verified-user' }, accessToken: 'request-token', params: {}, body: {}, ...overrides });

test('controller returns authenticated student progress', async () => {
  const result = await invoke('getAll', req(), service);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data.progress, []);
});

test('controller returns single problem progress and update', async () => {
  const one = await invoke('getOne', req({ params: { slug: 'two-sum' } }), service);
  assert.equal(one.statusCode, 200);
  assert.equal(one.body.data.progress.status, 'Not Started');

  const update = await invoke('update', req({ params: { slug: 'two-sum' }, body: { status: 'Completed' } }), service);
  assert.equal(update.statusCode, 200);
  assert.equal(update.body.data.progress.status, 'Completed');
});

test('controller maps invalid status, not found, and database errors safely', async () => {
  const invalid = await invoke('update', req({ params: { slug: 'two-sum' }, body: { status: 'Not Started' } }), {
    ...service,
    upsertStudentProblemProgress: async () => ({ success: false, invalidStatus: true, message: 'Status must be Attempted or Completed' }),
  });
  assert.equal(invalid.statusCode, 400);

  const notFound = await invoke('getOne', req({ params: { slug: 'missing' } }), {
    ...service,
    getStudentProblemProgress: async () => ({ success: false, notFound: true, message: 'DSA problem not found' }),
  });
  assert.equal(notFound.statusCode, 404);

  const failed = await invoke('getAll', req(), {
    ...service,
    getStudentProgress: async () => ({ success: false, message: 'Unable to retrieve student progress' }),
  });
  assert.equal(failed.statusCode, 503);
});
