/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

const assert = require('assert');
const base64 = require('../lib/base64');

it('test out of range encoding', () => {
  assert.throws(() => {
    base64.encode(-1);
  });
  assert.throws(() => {
    base64.encode(64);
  });
});

it('test out of range decoding', () => {
  assert.equal(base64.decode('='.charCodeAt(0)), -1);
});

it('test normal encoding and decoding', () => {
  for (let i = 0; i < 64; i++) {
    assert.equal(base64.decode(base64.encode(i).charCodeAt(0)), i);
  }
});
