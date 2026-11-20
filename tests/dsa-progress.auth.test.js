import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

const { createAuthenticateUser } = await import('../src/middleware/auth.middleware.js');
const { createSupabaseUserClient } = await import('../src/config/supabase-user.js');

const response = () => {
  let statusCode;
  let body;
  return {
    res: {
      status(code) { statusCode = code; return this; },
      json(value) { body = value; return this; },
    },
    get result() { return { statusCode, body }; },
  };
};

test('missing or invalid bearer tokens return 401 without next', async () => {
  for (const authorization of [undefined, 'Basic value', 'Bearer   ']) {
    let nextCalled = false;
    const output = response();
    await createAuthenticateUser(async () => ({ success: false, data: null }))(
      { get: () => authorization },
      output.res,
      () => { nextCalled = true; },
    );
    assert.equal(output.result.statusCode, 401);
    assert.equal(nextCalled, false);
  }
});

test('valid token attaches verified user and request-scoped token', async () => {
  let nextCalled = false;
  const req = { get: () => 'Bearer verified-token' };
  await createAuthenticateUser(async token => {
    assert.equal(token, 'verified-token');
    return { success: true, data: { user: { id: 'verified-user' } } };
  })(req, response().res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: 'verified-user' });
  assert.equal(req.accessToken, 'verified-token');
});

test('user client requires a token and uses the publishable client configuration', () => {
  assert.equal(createSupabaseUserClient(), null);
  const client = createSupabaseUserClient('student-token');
  assert.ok(client);
  assert.equal(typeof client.from, 'function');
});
