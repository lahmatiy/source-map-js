import { ok, strictEqual } from 'assert';
import { ArraySet } from '../lib/array-set.js';

function makeTestSet() {
  const set = new ArraySet();
  for (let i = 0; i < 100; i++) {
    set.add(String(i));
  }
  return set;
}

it('test .has() membership', () => {
  const set = makeTestSet();
  for (let i = 0; i < 100; i++) {
    ok(set.has(String(i)));
  }
});

it('test .indexOf() elements', () => {
  const set = makeTestSet();
  for (let i = 0; i < 100; i++) {
    strictEqual(set.indexOf(String(i)), i);
  }
});

it('test .at() indexing', () => {
  const set = makeTestSet();
  for (let i = 0; i < 100; i++) {
    strictEqual(set.at(i), String(i));
  }
});

it('test creating from an array', () => {
  const set = ArraySet.fromArray(['foo', 'bar', 'baz', 'quux', 'hasOwnProperty']);

  ok(set.has('foo'));
  ok(set.has('bar'));
  ok(set.has('baz'));
  ok(set.has('quux'));
  ok(set.has('hasOwnProperty'));

  strictEqual(set.indexOf('foo'), 0);
  strictEqual(set.indexOf('bar'), 1);
  strictEqual(set.indexOf('baz'), 2);
  strictEqual(set.indexOf('quux'), 3);

  strictEqual(set.at(0), 'foo');
  strictEqual(set.at(1), 'bar');
  strictEqual(set.at(2), 'baz');
  strictEqual(set.at(3), 'quux');
});

it('test that you can add __proto__; see github issue #30', () => {
  const set = new ArraySet();
  set.add('__proto__');
  ok(set.has('__proto__'));
  strictEqual(set.at(0), '__proto__');
  strictEqual(set.indexOf('__proto__'), 0);
});

describe('test .fromArray() with duplicates', () => {
  it('duplicates are not allowed', () => {
    const set = ArraySet.fromArray(['foo', 'foo']);
    ok(set.has('foo'));
    strictEqual(set.at(0), 'foo');
    strictEqual(set.indexOf('foo'), 0);
    strictEqual(set.toArray().length, 1);
  });

  it('duplicates are allowed', () => {
    const set = ArraySet.fromArray(['foo', 'foo'], true);
    ok(set.has('foo'));
    strictEqual(set.at(0), 'foo');
    strictEqual(set.at(1), 'foo');
    strictEqual(set.indexOf('foo'), 0);
    strictEqual(set.toArray().length, 2);
  });
});

it('test .add() with duplicates', () => {
  const set = new ArraySet();
  set.add('foo');

  set.add('foo');
  ok(set.has('foo'));
  strictEqual(set.at(0), 'foo');
  strictEqual(set.indexOf('foo'), 0);
  strictEqual(set.toArray().length, 1);

  set.add('foo', true);
  ok(set.has('foo'));
  strictEqual(set.at(0), 'foo');
  strictEqual(set.at(1), 'foo');
  strictEqual(set.indexOf('foo'), 0);
  strictEqual(set.toArray().length, 2);
});

it('test .size()', () => {
  const set = new ArraySet();
  set.add('foo');
  set.add('bar');
  set.add('baz');
  strictEqual(set.size(), 3);
});

it('test .size() with disallowed duplicates', () => {
  const set = new ArraySet();

  set.add('foo');
  set.add('foo');

  set.add('bar');
  set.add('bar');

  set.add('baz');
  set.add('baz');

  strictEqual(set.size(), 3);
});

it('test .size() with allowed duplicates', () => {
  const set = new ArraySet();

  set.add('foo');
  set.add('foo', true);

  set.add('bar');
  set.add('bar', true);

  set.add('baz');
  set.add('baz', true);

  strictEqual(set.size(), 3);
});
