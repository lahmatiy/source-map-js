/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
class ArraySet {
  constructor() {
    this._array = [];
    this._set = new Map();
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  static fromArray(array, allowDuplicates = false) {
    const set = new ArraySet();

    for (let i = 0; i < array.length; i++) {
      set.add(array[i], allowDuplicates);
    }

    return set;
  }

  /**
   * Return how many unique items are in this ArraySet. If duplicates have been
   * added, than those do not count towards the size.
   *
   * @returns {Number}
   */
  size() {
    return this._set.size;
  }

  /**
   * Add the given string to this set.
   *
   * @param {String} str
   * @param {Boolean} allowDuplicates
   */
  add(str, allowDuplicates = false) {
    const isDuplicate = this.has(str);
    const idx = this._array.length;

    if (!isDuplicate || allowDuplicates) {
      this._array.push(str);
    }

    if (!isDuplicate) {
      this._set.set(str, idx);
    }
  }

  /**
   * Is the given string a member of this set?
   *
   * @param {String} str
   */
  has(str) {
    return this._set.has(str);
  }

  /**
   * What is the index of the given string in the array?
   *
   * @param {String} str
   */
  indexOf(str) {
    const idx = this._set.get(str);
    if (idx >= 0) {
        return idx;
    }

    throw new Error('"' + str + '" is not in the set.');
  }

  /**
   * What is the element at the given index?
   *
   * @param {Number} index
   */
  at(index) {
    if (index >= 0 && index < this._array.length) {
      return this._array[index];
    }

    throw new Error('No element indexed by ' + index);
  }

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  toArray() {
    return this._array.slice();
  }
}

exports.ArraySet = ArraySet;
