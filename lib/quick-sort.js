// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `array`.
 *
 * @param {Array} array The array.
 * @param {Number} x The index of the first item.
 * @param {Number} y The index of the second item.
 */
function swap(array, x, y) {
  const temp = array[x];
  array[x] = array[y];
  array[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low The lower bound on the range.
 * @param {Number} high The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

function cloneSort(comparator) {
  /**
  * The Quick Sort algorithm.
  *
  * @param {Array} array An array to sort.
  * @param {Number} p Start index of the array
  * @param {Number} r End index of the array
  */
  return function doQuickSort(array, p, r) {
    // If our lower bound is less than our upper bound, we (1) partition the
    // array into two pieces and (2) recurse on each half. If it is not, this is
    // the empty array and our base case.
 
    if (p < r) {
      // (1) Partitioning.
      //
      // The partitioning chooses a pivot between `p` and `r` and moves all
      // elements that are less than or equal to the pivot to the before it, and
      // all the elements that are greater than it after it. The effect is that
      // once partition is done, the pivot is in the exact place it will be when
      // the array is put in sorted order, and it will not need to be moved
      // again. This runs in O(n) time.
  
      // Always choose a random pivot so that an input array which is reverse
      // sorted does not cause O(n^2) running time.
      let pivotIndex = randomIntInRange(p, r);
      let i = p - 1;
      let j = p;
  
      swap(array, pivotIndex, r);
      const pivot = array[r];
  
      // Immediately after `j` is incremented in this loop, the following hold
      // true:
      //
      //   * Every element in `array[p .. i]` is less than or equal to the pivot.
      //
      //   * Every element in `array[i+1 .. j-1]` is greater than the pivot.
      for (; j < r; j++) {
        if (comparator(array[j], pivot, false) <= 0) {
          i++;
          swap(array, i, j);
        }
      }
  
      swap(array, i + 1, j);
      const q = i + 1;
  
      // (2) Recurse on each half.
  
      doQuickSort(array, p, q - 1);
      doQuickSort(array, q + 1, r);
    }
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} array An array to sort.
 * @param {function} comparator Function to use to compare two items.
 */

let sortCache = new WeakMap();
export function quickSort(array, comparator, start = 0) {
  let doQuickSort = sortCache.get(comparator);

  if (doQuickSort === void 0) {
    doQuickSort = cloneSort(comparator);
    sortCache.set(comparator, doQuickSort);
  }

  doQuickSort(array, start, array.length - 1);
}
