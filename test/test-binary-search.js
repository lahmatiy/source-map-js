/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

const assert = require('assert');
const binarySearch = require('../lib/binary-search');

function numberCompare(a, b) {
  return a - b;
}

it('test too high with default (glb) bias', () => {
  const needle = 30;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.doesNotThrow(() => {
    binarySearch.search(needle, haystack, numberCompare);
  });

  assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare)], 20);
});

it('test too low with default (glb) bias', () => {
  const needle = 1;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.doesNotThrow(() => {
    binarySearch.search(needle, haystack, numberCompare);
  });

  assert.equal(binarySearch.search(needle, haystack, numberCompare), -1);
});

it('test too high with lub bias', () => {
  const needle = 30;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.doesNotThrow(() => {
    binarySearch.search(needle, haystack, numberCompare);
  });

  assert.equal(binarySearch.search(needle, haystack, numberCompare,
                                   binarySearch.LEAST_UPPER_BOUND), -1);
});

it('test too low with lub bias', () => {
  const needle = 1;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.doesNotThrow(() => {
    binarySearch.search(needle, haystack, numberCompare);
  });

  assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare,
                                            binarySearch.LEAST_UPPER_BOUND)], 2);
});

it('test exact search', () => {
  const needle = 4;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare)], 4);
});

it('test fuzzy search with default (glb) bias', () => {
  const needle = 19;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare)], 18);
});

it('test fuzzy search with lub bias', () => {
  const needle = 19;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare,
                                            binarySearch.LEAST_UPPER_BOUND)], 20);
});

it('test multiple matches', () => {
  const needle = 5;
  const haystack = [1, 1, 2, 5, 5, 5, 13, 21];

  assert.equal(binarySearch.search(needle, haystack, numberCompare,
                                   binarySearch.LEAST_UPPER_BOUND), 3);
});

it('test multiple matches at the beginning', () => {
  const needle = 1;
  const haystack = [1, 1, 2, 5, 5, 5, 13, 21];

  assert.equal(binarySearch.search(needle, haystack, numberCompare,
                                   binarySearch.LEAST_UPPER_BOUND), 0);
});
