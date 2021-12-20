import { equal } from 'assert';
import {
  urlGenerate,
  urlParse,
  normalize,
  join,
  relative,
  computeSourceURL
} from '../lib/util.js';

it('test urls', () => {
  const assertUrl = (url) => {
    equal(url, urlGenerate(urlParse(url)));
  };

  assertUrl('http://');
  assertUrl('http://www.example.com');
  assertUrl('http://user:pass@www.example.com');
  assertUrl('http://www.example.com:80');
  assertUrl('http://www.example.com/');
  assertUrl('http://www.example.com/foo/bar');
  assertUrl('http://www.example.com/foo/bar/');
  assertUrl('http://user:pass@www.example.com:80/foo/bar/');

  assertUrl('//');
  assertUrl('//www.example.com');
  assertUrl('file:///www.example.com');

  equal(urlParse(''), null);
  equal(urlParse('.'), null);
  equal(urlParse('..'), null);
  equal(urlParse('a'), null);
  equal(urlParse('a/b'), null);
  equal(urlParse('a//b'), null);
  equal(urlParse('/a'), null);
  equal(urlParse('data:foo,bar'), null);

  const parsed = urlParse('http://x-y.com/bar');
  equal(parsed.scheme, 'http');
  equal(parsed.host, 'x-y.com');
  equal(parsed.path, '/bar');

  const webpackURL = 'webpack:///webpack/bootstrap 67e184f9679733298d44'
  const parsed2 = urlParse(webpackURL);
  equal(parsed2.scheme, 'webpack');
  equal(parsed2.host, '');
  equal(parsed2.path, '/webpack/bootstrap 67e184f9679733298d44');
  equal(webpackURL, urlGenerate(parsed2));
});

it('test normalize()', () => {
  equal(normalize('/..'), '/');
  equal(normalize('/../'), '/');
  equal(normalize('/../../../..'), '/');
  equal(normalize('/../../../../a/b/c'), '/a/b/c');
  equal(normalize('/a/b/c/../../../d/../../e'), '/e');

  equal(normalize('..'), '..');
  equal(normalize('../'), '../');
  equal(normalize('../../a/'), '../../a/');
  equal(normalize('a/..'), '.');
  equal(normalize('a/../../..'), '../..');

  equal(normalize('/.'), '/');
  equal(normalize('/./'), '/');
  equal(normalize('/./././.'), '/');
  equal(normalize('/././././a/b/c'), '/a/b/c');
  equal(normalize('/a/b/c/./././d/././e'), '/a/b/c/d/e');

  equal(normalize(''), '.');
  equal(normalize('.'), '.');
  equal(normalize('./'), '.');
  equal(normalize('././a'), 'a');
  equal(normalize('a/./'), 'a/');
  equal(normalize('a/././.'), 'a');

  equal(normalize('/a/b//c////d/////'), '/a/b/c/d/');
  equal(normalize('///a/b//c////d/////'), '///a/b/c/d/');
  equal(normalize('a/b//c////d'), 'a/b/c/d');

  equal(normalize('.///.././../a/b//./..'), '../../a')

  equal(normalize('http://www.example.com'), 'http://www.example.com');
  equal(normalize('http://www.example.com/'), 'http://www.example.com/');
  equal(normalize('http://www.example.com/./..//a/b/c/.././d//'), 'http://www.example.com/a/b/d/');
});

it('test join()', () => {
  equal(join('a', 'b'), 'a/b');
  equal(join('a/', 'b'), 'a/b');
  equal(join('a//', 'b'), 'a/b');
  equal(join('a', 'b/'), 'a/b/');
  equal(join('a', 'b//'), 'a/b/');
  equal(join('a/', '/b'), '/b');
  equal(join('a//', '//b'), '//b');

  equal(join('a', '..'), '.');
  equal(join('a', '../b'), 'b');
  equal(join('a/b', '../c'), 'a/c');

  equal(join('a', '.'), 'a');
  equal(join('a', './b'), 'a/b');
  equal(join('a/b', './c'), 'a/b/c');

  equal(join('a', 'http://www.example.com'), 'http://www.example.com');
  equal(join('a', 'data:foo,bar'), 'data:foo,bar');


  equal(join('', 'b'), 'b');
  equal(join('.', 'b'), 'b');
  equal(join('', 'b/'), 'b/');
  equal(join('.', 'b/'), 'b/');
  equal(join('', 'b//'), 'b/');
  equal(join('.', 'b//'), 'b/');

  equal(join('', '..'), '..');
  equal(join('.', '..'), '..');
  equal(join('', '../b'), '../b');
  equal(join('.', '../b'), '../b');

  equal(join('', '.'), '.');
  equal(join('.', '.'), '.');
  equal(join('', './b'), 'b');
  equal(join('.', './b'), 'b');

  equal(join('', 'http://www.example.com'), 'http://www.example.com');
  equal(join('.', 'http://www.example.com'), 'http://www.example.com');
  equal(join('', 'data:foo,bar'), 'data:foo,bar');
  equal(join('.', 'data:foo,bar'), 'data:foo,bar');


  equal(join('..', 'b'), '../b');
  equal(join('..', 'b/'), '../b/');
  equal(join('..', 'b//'), '../b/');

  equal(join('..', '..'), '../..');
  equal(join('..', '../b'), '../../b');

  equal(join('..', '.'), '..');
  equal(join('..', './b'), '../b');

  equal(join('..', 'http://www.example.com'), 'http://www.example.com');
  equal(join('..', 'data:foo,bar'), 'data:foo,bar');


  equal(join('a', ''), 'a');
  equal(join('a', '.'), 'a');
  equal(join('a/', ''), 'a');
  equal(join('a/', '.'), 'a');
  equal(join('a//', ''), 'a');
  equal(join('a//', '.'), 'a');
  equal(join('/a', ''), '/a');
  equal(join('/a', '.'), '/a');
  equal(join('', ''), '.');
  equal(join('.', ''), '.');
  equal(join('.', ''), '.');
  equal(join('.', '.'), '.');
  equal(join('..', ''), '..');
  equal(join('..', '.'), '..');
  equal(join('http://foo.org/a', ''), 'http://foo.org/a');
  equal(join('http://foo.org/a', '.'), 'http://foo.org/a');
  equal(join('http://foo.org/a/', ''), 'http://foo.org/a');
  equal(join('http://foo.org/a/', '.'), 'http://foo.org/a');
  equal(join('http://foo.org/a//', ''), 'http://foo.org/a');
  equal(join('http://foo.org/a//', '.'), 'http://foo.org/a');
  equal(join('http://foo.org', ''), 'http://foo.org/');
  equal(join('http://foo.org', '.'), 'http://foo.org/');
  equal(join('http://foo.org/', ''), 'http://foo.org/');
  equal(join('http://foo.org/', '.'), 'http://foo.org/');
  equal(join('http://foo.org//', ''), 'http://foo.org/');
  equal(join('http://foo.org//', '.'), 'http://foo.org/');
  equal(join('//www.example.com', ''), '//www.example.com/');
  equal(join('//www.example.com', '.'), '//www.example.com/');


  equal(join('http://foo.org/a', 'b'), 'http://foo.org/a/b');
  equal(join('http://foo.org/a/', 'b'), 'http://foo.org/a/b');
  equal(join('http://foo.org/a//', 'b'), 'http://foo.org/a/b');
  equal(join('http://foo.org/a', 'b/'), 'http://foo.org/a/b/');
  equal(join('http://foo.org/a', 'b//'), 'http://foo.org/a/b/');
  equal(join('http://foo.org/a/', '/b'), 'http://foo.org/b');
  equal(join('http://foo.org/a//', '//b'), 'http://b');

  equal(join('http://foo.org/a', '..'), 'http://foo.org/');
  equal(join('http://foo.org/a', '../b'), 'http://foo.org/b');
  equal(join('http://foo.org/a/b', '../c'), 'http://foo.org/a/c');

  equal(join('http://foo.org/a', '.'), 'http://foo.org/a');
  equal(join('http://foo.org/a', './b'), 'http://foo.org/a/b');
  equal(join('http://foo.org/a/b', './c'), 'http://foo.org/a/b/c');

  equal(join('http://foo.org/a', 'http://www.example.com'), 'http://www.example.com');
  equal(join('http://foo.org/a', 'data:foo,bar'), 'data:foo,bar');


  equal(join('http://foo.org', 'a'), 'http://foo.org/a');
  equal(join('http://foo.org/', 'a'), 'http://foo.org/a');
  equal(join('http://foo.org//', 'a'), 'http://foo.org/a');
  equal(join('http://foo.org', '/a'), 'http://foo.org/a');
  equal(join('http://foo.org/', '/a'), 'http://foo.org/a');
  equal(join('http://foo.org//', '/a'), 'http://foo.org/a');


  equal(join('http://', 'www.example.com'), 'http://www.example.com');
  equal(join('file:///', 'www.example.com'), 'file:///www.example.com');
  equal(join('http://', 'ftp://example.com'), 'ftp://example.com');

  equal(join('http://www.example.com', '//foo.org/bar'), 'http://foo.org/bar');
  equal(join('//www.example.com', '//foo.org/bar'), '//foo.org/bar');
});

// TODO Issue #128: Define and test this function properly.
it('test relative()', () => {
  equal(relative('/the/root', '/the/root/one.js'), 'one.js');
  equal(relative('http://the/root', 'http://the/root/one.js'), 'one.js');
  equal(relative('/the/root', '/the/rootone.js'), '../rootone.js');
  equal(relative('http://the/root', 'http://the/rootone.js'), '../rootone.js');
  equal(relative('/the/root', '/therootone.js'), '/therootone.js');
  equal(relative('http://the/root', '/therootone.js'), '/therootone.js');

  equal(relative('', '/the/root/one.js'), '/the/root/one.js');
  equal(relative('.', '/the/root/one.js'), '/the/root/one.js');
  equal(relative('', 'the/root/one.js'), 'the/root/one.js');
  equal(relative('.', 'the/root/one.js'), 'the/root/one.js');

  equal(relative('/', '/the/root/one.js'), 'the/root/one.js');
  equal(relative('/', 'the/root/one.js'), 'the/root/one.js');
});

it('test computeSourceURL', () => {
  // Tests with sourceMapURL.
  equal(
    computeSourceURL('', 'src/test.js', 'http://example.com'),
    'http://example.com/src/test.js'
  );
  equal(
    computeSourceURL(undefined, 'src/test.js', 'http://example.com'),
    'http://example.com/src/test.js'
  );
  equal(
    computeSourceURL('src', 'test.js', 'http://example.com'),
    'http://example.com/src/test.js'
  );
  equal(
    computeSourceURL('src/', 'test.js', 'http://example.com'),
    'http://example.com/src/test.js'
  );
  equal(
    computeSourceURL('src', '/test.js', 'http://example.com'),
    'http://example.com/src/test.js'
  );
  equal(
    computeSourceURL('http://mozilla.com', 'src/test.js', 'http://example.com'),
    'http://mozilla.com/src/test.js'
  );
  equal(
    computeSourceURL('', 'test.js', 'http://example.com/src/test.js.map'),
    'http://example.com/src/test.js'
  );

  // Legacy code won't pass in the sourceMapURL.
  equal(computeSourceURL('', 'src/test.js'), 'src/test.js');
  equal(computeSourceURL(undefined, 'src/test.js'), 'src/test.js');
  equal(computeSourceURL('src', 'test.js'), 'src/test.js');
  equal(computeSourceURL('src/', 'test.js'), 'src/test.js');
  equal(computeSourceURL('src', '/test.js'), 'src/test.js');
  equal(computeSourceURL('src', '../test.js'), 'test.js');
  equal(computeSourceURL('src/dir', '../././../test.js'), 'test.js');

  // This gives different results with the old algorithm and the new
  // spec-compliant algorithm.
  equal(
    computeSourceURL('http://example.com/dir', '/test.js'),
    'http://example.com/dir/test.js'
  );
});
