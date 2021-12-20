import { equal } from 'assert';
import { encode, decode } from '../lib/base64-vlq.js';

it('test normal encoding and decoding', () => {
  const result = {};
  for (let i = -255; i < 256; i++) {
    const str = encode(i);
    decode(str, 0, result);
    equal(result.value, i);
    equal(result.rest, str.length);
  }
});
