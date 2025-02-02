import { doesNotThrow, equal } from 'assert';
import { search, LEAST_UPPER_BOUND } from '../lib/binary-search.js';

function numberCompare(a, b) {
  return a - b;
}

it('test too high with default (glb) bias', () => {
  const needle = 30;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  doesNotThrow(() => {
    search(needle, haystack, numberCompare);
  });

  equal(haystack[search(needle, haystack, numberCompare)], 20);
});

it('test too low with default (glb) bias', () => {
  const needle = 1;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  doesNotThrow(() => {
    search(needle, haystack, numberCompare);
  });

  equal(search(needle, haystack, numberCompare), -1);
});

it('test too high with lub bias', () => {
  const needle = 30;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  doesNotThrow(() => {
    search(needle, haystack, numberCompare);
  });

  equal(search(needle, haystack, numberCompare,
                                   LEAST_UPPER_BOUND), -1);
});

it('test too low with lub bias', () => {
  const needle = 1;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  doesNotThrow(() => {
    search(needle, haystack, numberCompare);
  });

  equal(haystack[search(needle, haystack, numberCompare,
                                            LEAST_UPPER_BOUND)], 2);
});

it('test exact search', () => {
  const needle = 4;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  equal(haystack[search(needle, haystack, numberCompare)], 4);
});

it('test fuzzy search with default (glb) bias', () => {
  const needle = 19;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  equal(haystack[search(needle, haystack, numberCompare)], 18);
});

it('test fuzzy search with lub bias', () => {
  const needle = 19;
  const haystack = [2,4,6,8,10,12,14,16,18,20];

  equal(haystack[search(needle, haystack, numberCompare,
                                            LEAST_UPPER_BOUND)], 20);
});

it('test multiple matches', () => {
  const needle = 5;
  const haystack = [1, 1, 2, 5, 5, 5, 13, 21];

  equal(search(needle, haystack, numberCompare,
                                   LEAST_UPPER_BOUND), 3);
});

it('test multiple matches at the beginning', () => {
  const needle = 1;
  const haystack = [1, 1, 2, 5, 5, 5, 13, 21];

  equal(search(needle, haystack, numberCompare,
                                   LEAST_UPPER_BOUND), 0);
});
