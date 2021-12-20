export const GREATEST_LOWER_BOUND = 1;
export const LEAST_UPPER_BOUND = 2;

// TODO: rewrite using a loop
/**
 * Recursive implementation of binary search.
 *
 * @param low Indices here and lower do not contain the needle.
 * @param high Indices here and higher do not contain the needle.
 * @param needle The element being searched for.
 * @param haystack The non-empty array being searched.
 * @param compare Function which takes two elements and returns -1, 0, or 1.
 * @param bias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(low, high, needle, haystack, compare, bias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  let mid = Math.floor((high - low) / 2) + low;
  let cmp = compare(needle, haystack[mid], true);

  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  } else if (cmp > 0) {
    // Our needle is greater than haystack[mid].
    if (high - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, high, needle, haystack, compare, bias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (bias === LEAST_UPPER_BOUND) {
      return high < haystack.length ? high : -1;
    } else {
      return mid;
    }
  } else {
    // Our needle is less than haystack[mid].
    if (mid - low > 1) {
      // The element is in the lower half.
      return recursiveSearch(low, mid, needle, haystack, compare, bias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (bias === LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return low < 0 ? -1 : low;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param needle The element you are looking for.
 * @param haystack The array that is being searched.
 * @param compare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param bias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
export function search(needle, haystack, compare, bias) {
  if (haystack.length === 0) {
    return -1;
  }

  let index = recursiveSearch(
    -1,
    haystack.length,
    needle,
    haystack,
    compare,
    bias || GREATEST_LOWER_BOUND
  );

  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  for (; index - 1 >= 0; index--) {
    if (compare(haystack[index], haystack[index - 1], true) !== 0) {
      break;
    }
  }

  return index;
}
