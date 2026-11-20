import assert from 'node:assert/strict';
import { test } from 'node:test';

const { createGetProblems } = await import('../src/controllers/dsa-problem.controller.js');

const invoke = async (query, service) => {
  let statusCode;
  let body;
  let nextCalled = false;
  const req = { query };
  const res = {
    status(status) {
      statusCode = status;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  await createGetProblems(service)(req, res, () => {
    nextCalled = true;
  });

  return { statusCode, body, nextCalled };
};

const successService = async filters => ({
  success: true,
  data: {
    problems: [],
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: 0,
      totalPages: 0,
    },
  },
});

test('controller uses page 1 and limit 20 by default', async () => {
  let received;
  const result = await invoke({}, async filters => {
    received = filters;
    return successService(filters);
  });

  assert.deepEqual(received, { page: 1, limit: 20, difficulty: undefined });
  assert.equal(result.statusCode, 200);
});

test('controller accepts valid pagination and difficulty values', async () => {
  let received;
  const result = await invoke({ page: '2', limit: '50', difficulty: 'Hard' }, async filters => {
    received = filters;
    return successService(filters);
  });

  assert.deepEqual(received, { page: 2, limit: 50, difficulty: 'Hard' });
  assert.equal(result.statusCode, 200);
});

test('controller accepts Easy, Medium, and Hard', async () => {
  for (const difficulty of ['Easy', 'Medium', 'Hard']) {
    const result = await invoke({ difficulty }, successService);
    assert.equal(result.statusCode, 200);
  }
});

test('controller rejects invalid page values', async () => {
  for (const page of ['0', '-1', 'abc', '1.5']) {
    const result = await invoke({ page }, successService);
    assert.equal(result.statusCode, 400);
  }
});

test('controller rejects invalid limit values', async () => {
  for (const limit of ['0', '-1', 'abc', '101']) {
    const result = await invoke({ limit }, successService);
    assert.equal(result.statusCode, 400);
  }
});

test('controller rejects unsupported difficulty', async () => {
  const result = await invoke({ difficulty: 'Extreme' }, successService);
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, {
    success: false,
    message: 'difficulty must be Easy, Medium, or Hard',
    data: null,
  });
});

test('controller returns service pagination metadata', async () => {
  const result = await invoke({}, async () => ({
    success: true,
    data: {
      problems: [],
      pagination: { page: 3, limit: 10, total: 25, totalPages: 3 },
    },
  }));

  assert.deepEqual(result.body.data.pagination, { page: 3, limit: 10, total: 25, totalPages: 3 });
});

test('controller returns a safe response when service fails', async () => {
  const result = await invoke({}, async () => ({
    success: false,
    message: 'Unable to retrieve DSA problems',
  }));

  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, {
    success: false,
    message: 'Unable to retrieve DSA problems',
    data: null,
  });
  assert.equal(result.nextCalled, false);
});
