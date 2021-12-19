const assert = require('assert');
const { quickSort } = require('../lib/quick-sort');

function numberCompare(a, b) {
  return a - b;
}

it('test sorting sorted array', () => {
  const ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const quickSorted = ary.slice();

  quickSort(quickSorted, numberCompare);

  assert.equal(JSON.stringify(ary),
               JSON.stringify(quickSorted));
});

it('test sorting reverse-sorted array', () => {
  const ary = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const quickSorted = ary.slice();

  quickSort(quickSorted, numberCompare);

  assert.equal(JSON.stringify(ary.sort(numberCompare)),
               JSON.stringify(quickSorted));
});

it('test sorting unsorted array', () => {
  const ary = [];
  for (let i = 0; i < 10; i++) {
    ary.push(Math.random()); // FIXME: that's a flaky test
  }

  const quickSorted = ary.slice();
  quickSort(quickSorted, numberCompare);

  assert.equal(JSON.stringify(ary.sort(numberCompare)),
               JSON.stringify(quickSorted));
});
