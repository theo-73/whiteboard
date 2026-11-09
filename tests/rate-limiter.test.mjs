import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../src/lib/rate-limiter.ts';

test('Rate Limiter - Enforces Request Cap within Window', () => {
  const testIp = 'test-client-' + Math.random().toString(36).substring(2, 8);
  const maxRequests = 5;

  for (let i = 0; i < maxRequests; i++) {
    const res = checkRateLimit(testIp, maxRequests, 10000);
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
    assert.equal(res.remaining, maxRequests - 1 - i);
  }

  // Next request should be blocked
  const blockedRes = checkRateLimit(testIp, maxRequests, 10000);
  assert.equal(blockedRes.allowed, false, 'Request over limit should be blocked');
  assert.equal(blockedRes.remaining, 0);
  assert.ok(blockedRes.reset > Date.now());
});
