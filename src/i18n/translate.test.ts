import assert from 'node:assert/strict'
import { test } from 'node:test'
import { translate, type Messages } from './translate.ts'

const messages: Messages = {
  app: { title: 'Arorms', nested: { deep: 'Deep value' } },
  greet: 'Hello {{name}}, you have {{count}} items',
}

test('resolves dot paths', () => {
  assert.equal(translate(messages, 'app.title'), 'Arorms')
  assert.equal(translate(messages, 'app.nested.deep'), 'Deep value')
})

test('missing keys echo back the key instead of throwing', () => {
  assert.equal(translate(messages, 'app.missing'), 'app.missing')
  assert.equal(translate(messages, 'nope.at.all'), 'nope.at.all')
  assert.equal(translate(undefined, 'any.key'), 'any.key')
})

test('non-string leaves echo back the key', () => {
  assert.equal(translate(messages, 'app.nested'), 'app.nested')
})

test('interpolates params and leaves unknown placeholders intact', () => {
  assert.equal(translate(messages, 'greet', { name: 'Ada', count: 3 }), 'Hello Ada, you have 3 items')
  assert.equal(translate(messages, 'greet', { name: 'Ada' }), 'Hello Ada, you have {{count}} items')
})
