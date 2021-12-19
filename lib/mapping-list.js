const { compareByGeneratedPositionsInflated } = require('./util');

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  const lineA = mappingA.generatedLine;
  const lineB = mappingB.generatedLine;
  const columnA = mappingA.generatedColumn;
  const columnB = mappingB.generatedColumn;

  return (
    lineB > lineA ||
    lineB == lineA && columnB >= columnA ||
    compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0
  );
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
class MappingList {
  constructor() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {
      generatedLine: -1,
      generatedColumn: 0
    };
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  unsortedForEach(callback, thisArg) {
      this._array.forEach(callback, thisArg);
    };

  /**
   * Add the given source mapping.
   *
   * @param {Object} mapping
   */
  add(mapping) {
    if (generatedPositionAfter(this._last, mapping)) {
      this._last = mapping;
      this._array.push(mapping);
    } else {
      this._sorted = false;
      this._array.push(mapping);
    }
  };

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  toArray() {
    if (!this._sorted) {
      this._array.sort(compareByGeneratedPositionsInflated);
      this._sorted = true;
    }

    return this._array;
  }
};

exports.MappingList = MappingList;
