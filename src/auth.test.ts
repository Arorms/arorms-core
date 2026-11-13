import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ErrorResponse, User } from 'oidc-client-ts'
import { EXPIRING_SKEW_SECONDS, isTerminalAuthError, needsRefresh } from './auth.ts'

const profile = { sub: 'test', iss: 'https://auth.test', aud: 'test', exp: 0, iat: 0 }

const makeUser = (expiresInSeconds: number): User =>
  new User({
    access_token: 'token',
    token_type: 'Bearer',
    scope: 'openid',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    profile,
  })

test('needsRefresh is false for null and for a token with no expiry', () => {
  assert.equal(needsRefresh(null), false)
  assert.equal(needsRefresh(new User({ access_token: 't', token_type: 'Bearer', scope: 'openid', profile })), false)
})

test('needsRefresh turns true inside the skew window but not before it', () => {
  assert.equal(needsRefresh(makeUser(EXPIRING_SKEW_SECONDS * 4)), false)
  assert.equal(needsRefresh(makeUser(EXPIRING_SKEW_SECONDS - 10)), true)
  assert.equal(needsRefresh(makeUser(-30)), true)
})

test('terminal errors are recognised by error code only', () => {
  assert.equal(isTerminalAuthError(new ErrorResponse({ error: 'invalid_grant' })), true)
  assert.equal(isTerminalAuthError(new ErrorResponse({ error: 'temporarily_unavailable' })), false)
  assert.equal(isTerminalAuthError(new Error('invalid_grant')), false)
  assert.equal(isTerminalAuthError(null), false)
})
