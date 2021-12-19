/*
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://github.com/google/closure-compiler/blob/master/src/com/google/debugging/sourcemap/Base64VLQ.java
 */

const base64 = require('./base64');

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

const VLQ_BASE_SHIFT = 5;

// binary: 100000
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
const VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
const VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(value) {
  return value < 0
    ? ((-value) << 1) + 1
    : (value << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(value) {
  const isNegative = (value & 1) === 1;
  const shifted = value >> 1;

  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(value) {
  let vlq = toVLQSigned(value);
  let encoded = '';
  let digit = 0;

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;

    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }

    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(str, index, outParam) {
  const strLen = str.length;
  let result = 0;
  let shift = 0;
  let continuation = 0;
  let digit = 0;

  do {
    if (index >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(str.charCodeAt(index++));

    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + str.charAt(index - 1));
    }

    continuation = digit & VLQ_CONTINUATION_BIT;
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation !== 0);

  outParam.value = fromVLQSigned(result);
  outParam.rest = index;
};
