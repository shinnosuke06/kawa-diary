import { expect, it } from 'vitest';
import { parseRoute } from './router';

it.each([
  ['', { name: 'home' }],
  ['#/', { name: 'home' }],
  ['#/items/new', { name: 'itemNew' }],
  ['#/items/a%20b', { name: 'item', itemId: 'a b' }],
  ['#/items/a/edit', { name: 'itemEdit', itemId: 'a' }],
  ['#/items/a/photos/new', { name: 'photoNew', itemId: 'a' }],
  ['#/items/a/photos/p1', { name: 'photoEdit', itemId: 'a', photoId: 'p1' }],
  ['#/items/a/care/new', { name: 'careNew', itemId: 'a' }],
  ['#/items/a/care/c1', { name: 'careEdit', itemId: 'a', careId: 'c1' }],
  ['#/items/a/wears', { name: 'wears', itemId: 'a' }],
  ['#/items/a/compare', { name: 'compare', itemId: 'a' }],
  ['#/foo', { name: 'notFound' }],
  ['#/items/a/unknown', { name: 'notFound' }],
])('parseRoute(%s)', (hash, want) => {
  expect(parseRoute(hash)).toEqual(want);
});
