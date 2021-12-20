const intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

const bigA = 65;     // 'A'
const bigZ = 90;     // 'Z'

const littleA = 97;  // 'a'
const littleZ = 122; // 'z'

const zero = 48;     // '0'
const nine = 57;     // '9'

const plus = 43;     // '+'
const slash = 47;    // '/'

const littleOffset = 26;
const numberOffset = 52;

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
export function encodeBase64(number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }

  // FIXME: is not symmetric with decode()
  throw new TypeError("Must be between 0 and 63: " + number);
}

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
export function decodeBase64(charCode) {
  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return charCode - bigA;
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return charCode - littleA + littleOffset;
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return charCode - zero + numberOffset;
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
}
