const assert = require('assert');
const base64VLQ = require('../lib/base64-vlq');

it('test normal encoding and decoding', () => {
  const result = {};
  for (let i = -255; i < 256; i++) {
    const str = base64VLQ.encode(i);
    base64VLQ.decode(str, 0, result);
    assert.equal(result.value, i);
    assert.equal(result.rest, str.length);
  }
});
