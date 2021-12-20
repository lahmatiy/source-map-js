import { throws, equal } from 'assert';
import { encodeBase64, decodeBase64 } from '../lib/base64.js';

it('test out of range encoding', () => {
  throws(() => {
    encodeBase64(-1);
  });
  throws(() => {
    encodeBase64(64);
  });
});

it('test out of range decoding', () => {
  equal(decodeBase64('='.charCodeAt(0)), -1);
});

it('test normal encoding and decoding', () => {
  for (let i = 0; i < 64; i++) {
    equal(decodeBase64(encodeBase64(i).charCodeAt(0)), i);
  }
});
