[![NPM version](https://img.shields.io/npm/v/source-map-js.svg)](https://www.npmjs.com/package/source-map-js)
[![Build status](https://github.com/lahmatiy/source-map-js/actions/workflows/build.yml/badge.svg)](https://github.com/lahmatiy/source-map-js/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/lahmatiy/source-map-js/badge.svg?branch=patch-0.6.1)](https://coveralls.io/github/lahmatiy/source-map-js?branch=patch-0.6.1)
[![NPM Downloads](https://img.shields.io/npm/dm/source-map-js.svg)](https://www.npmjs.com/package/source-map-js)

# Source Map JS

Difference between original [source-map](https://github.com/mozilla/source-map):

> TL,DR: it's fork of original source-map@0.6, but with perfomance optimizations.

This journey starts from [source-map@0.7.0](https://github.com/mozilla/source-map/blob/master/CHANGELOG.md#070). Some part of it was rewritten to Rust and WASM and API became async.

It's still a major block for many libraries like PostCSS or Webpack for example because they need to migrate the whole API to the async way. This is the reason why 0.6.1 has 2x more downloads than 0.7.3 while it's faster several times.

![Downloads count](media/downloads.png)

More important that WASM version has some optimizations in JS code too. This is why [community asked to create branch for 0.6 version](https://github.com/mozilla/source-map/issues/324) and port these optimizations but, sadly, the answer was «no». A bit later I discovered [the issue](https://github.com/mozilla/source-map/issues/370) created by [Ben Rothman (@benthemonkey)](https://github.com/benthemonkey) with no response at all.

[Roman Dvornov (@lahmatiy)](https://github.com/lahmatiy) wrote a [serveral posts](https://t.me/gorshochekvarit/76) (russian, only, sorry) about source-map library in his own Telegram channel. He mentioned the article [«Maybe you don't need Rust and WASM to speed up your JS»](https://mrale.ph/blog/2018/02/03/maybe-you-dont-need-rust-to-speed-up-your-js.html) written by [Vyacheslav Egorov (@mraleph)](https://github.com/mraleph). This article contains optimizations and hacks that lead to almost the same performance compare to WASM implementation.

I decided to fork the original source-map and port these optimizations from the article and several others PR from the original source-map.

---------

This is a library to generate and consume the source map format
[described here][format].

[format]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit

## Use with Node

    $ npm install source-map-js

<!-- ## Use on the Web

    <script src="https://raw.githubusercontent.com/mozilla/source-map/master/dist/source-map.min.js" defer></script> -->

--------------------------------------------------------------------------------

<!-- `npm run toc` to regenerate the Table of Contents -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Examples](#examples)
  - [Consuming a source map](#consuming-a-source-map)
  - [Generating a source map](#generating-a-source-map)
    - [With SourceNode (high level API)](#with-sourcenode-high-level-api)
    - [With SourceMapGenerator (low level API)](#with-sourcemapgenerator-low-level-api)
- [API](#api)
  - [SourceMapConsumer](#sourcemapconsumer)
    - [new SourceMapConsumer(rawSourceMap)](#new-sourcemapconsumerrawsourcemap)
    - [SourceMapConsumer.prototype.computeColumnSpans()](#sourcemapconsumerprototypecomputecolumnspans)
    - [SourceMapConsumer.prototype.originalPositionFor(generatedPosition)](#sourcemapconsumerprototypeoriginalpositionforgeneratedposition)
    - [SourceMapConsumer.prototype.generatedPositionFor(originalPosition)](#sourcemapconsumerprototypegeneratedpositionfororiginalposition)
    - [SourceMapConsumer.prototype.allGeneratedPositionsFor(originalPosition)](#sourcemapconsumerprototypeallgeneratedpositionsfororiginalposition)
    - [SourceMapConsumer.prototype.hasContentsOfAllSources()](#sourcemapconsumerprototypehascontentsofallsources)
    - [SourceMapConsumer.prototype.sourceContentFor(source[, returnNullOnMissing])](#sourcemapconsumerprototypesourcecontentforsource-returnnullonmissing)
    - [SourceMapConsumer.prototype.eachMapping(callback, context, order)](#sourcemapconsumerprototypeeachmappingcallback-context-order)
  - [SourceMapGenerator](#sourcemapgenerator)
    - [new SourceMapGenerator([startOfSourceMap])](#new-sourcemapgeneratorstartofsourcemap)
    - [SourceMapGenerator.fromSourceMap(sourceMapConsumer)](#sourcemapgeneratorfromsourcemapsourcemapconsumer)
    - [SourceMapGenerator.prototype.addMapping(mapping)](#sourcemapgeneratorprototypeaddmappingmapping)
    - [SourceMapGenerator.prototype.setSourceContent(sourceFile, sourceContent)](#sourcemapgeneratorprototypesetsourcecontentsourcefile-sourcecontent)
    - [SourceMapGenerator.prototype.applySourceMap(sourceMapConsumer[, sourceFile[, sourceMapPath]])](#sourcemapgeneratorprototypeapplysourcemapsourcemapconsumer-sourcefile-sourcemappath)
    - [SourceMapGenerator.prototype.toString()](#sourcemapgeneratorprototypetostring)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Examples

### Consuming a source map

```js
var rawSourceMap = {
  version: 3,
  file: 'min.js',
  names: ['bar', 'baz', 'n'],
  sources: ['one.js', 'two.js'],
  sourceRoot: 'http://example.com/www/js/',
  mappings: 'CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA'
};

var smc = new SourceMapConsumer(rawSourceMap);

console.log(smc.sources);
// [ 'http://example.com/www/js/one.js',
//   'http://example.com/www/js/two.js' ]

console.log(smc.originalPositionFor({
  line: 2,
  column: 28
}));
// { source: 'http://example.com/www/js/two.js',
//   line: 2,
//   column: 10,
//   name: 'n' }

console.log(smc.generatedPositionFor({
  source: 'http://example.com/www/js/two.js',
  line: 2,
  column: 10
}));
// { line: 2, column: 28 }

smc.eachMapping(function (m) {
  // ...
});
```

### Generating a source map

In depth guide:
[**Compiling to JavaScript, and Debugging with Source Maps**](https://hacks.mozilla.org/2013/05/compiling-to-javascript-and-debugging-with-source-maps/)

#### With SourceNode (high level API)

```js
function compile(ast) {
  switch (ast.type) {
  case 'BinaryExpression':
    return new SourceNode(
      ast.location.line,
      ast.location.column,
      ast.location.source,
      [compile(ast.left), " + ", compile(ast.right)]
    );
  case 'Literal':
    return new SourceNode(
      ast.location.line,
      ast.location.column,
      ast.location.source,
      String(ast.value)
    );
  // ...
  default:
    throw new Error("Bad AST");
  }
}

var ast = parse("40 + 2", "add.js");
console.log(compile(ast).toStringWithSourceMap({
  file: 'add.js'
}));
// { code: '40 + 2',
//   map: [object SourceMapGenerator] }
```

#### With SourceMapGenerator (low level API)

```js
var map = new SourceMapGenerator({
  file: "source-mapped.js"
});

map.addMapping({
  generated: {
    line: 10,
    column: 35
  },
  source: "foo.js",
  original: {
    line: 33,
    column: 2
  },
  name: "christopher"
});

console.log(map.toString());
// '{"version":3,"file":"source-mapped.js","sources":["foo.js"],"names":["christopher"],"mappings":";;;;;;;;;mCAgCEA"}'
```

## API

Get a reference to the module:

```js
// Node.js
var sourceMap = require('source-map');

// Browser builds
var sourceMap = window.sourceMap;

// Inside Firefox
const sourceMap = require("devtools/toolkit/sourcemap/source-map.js");
```

### SourceMapConsumer

A SourceMapConsumer instance represents a parsed source map which we can query
for information about the original file positions by giving it a file position
in the generated source.

#### new SourceMapConsumer(rawSourceMap)

The only parameter is the raw source map (either as a string which can be
`JSON.parse`'d, or an object). According to the spec, source maps have the
following attributes:

* `version`: Which version of the source map spec this map is following.

* `sources`: An array of URLs to the original source files.

* `names`: An array of identifiers which can be referenced by individual
  mappings.

* `sourceRoot`: Optional. The URL root from which all sources are relative.

* `sourcesContent`: Optional. An array of contents of the original source files.

* `mappings`: A string of base64 VLQs which contain the actual mappings.

* `file`: Optional. The generated filename this source map is associated with.

```js
var consumer = new sourceMap.SourceMapConsumer(rawSourceMapJsonData);
```

#### SourceMapConsumer.prototype.computeColumnSpans()

Compute the last column for each generated mapping. The last column is
inclusive.

```js
// Before:
consumer.allGeneratedPositionsFor({ line: 2, source: "foo.coffee" })
// [ { line: 2,
//     column: 1 },
//   { line: 2,
//     column: 10 },
//   { line: 2,
//     column: 20 } ]

consumer.computeColumnSpans();

// After:
consumer.allGeneratedPositionsFor({ line: 2, source: "foo.coffee" })
// [ { line: 2,
//     column: 1,
//     lastColumn: 9 },
//   { line: 2,
//     column: 10,
//     lastColumn: 19 },
//   { line: 2,
//     column: 20,
//     lastColumn: Infinity } ]

```

#### SourceMapConsumer.prototype.originalPositionFor(generatedPosition)

Returns the original source, line, and column information for the generated
source's line and column positions provided. The only argument is an object with
the following properties:

* `line`: The line number in the generated source.  Line numbers in
  this library are 1-based (note that the underlying source map
  specification uses 0-based line numbers -- this library handles the
  translation).

* `column`: The column number in the generated source.  Column numbers
  in this library are 0-based.

* `bias`: Either `SourceMapConsumer.GREATEST_LOWER_BOUND` or
  `SourceMapConsumer.LEAST_UPPER_BOUND`. Specifies whether to return the closest
  element that is smaller than or greater than the one we are searching for,
  respectively, if the exact element cannot be found.  Defaults to
  `SourceMapConsumer.GREATEST_LOWER_BOUND`.

and an object is returned with the following properties:

* `source`: The original source file, or null if this information is not
  available.

* `line`: The line number in the original source, or null if this information is
  not available.  The line number is 1-based.

* `column`: The column number in the original source, or null if this
  information is not available.  The column number is 0-based.

* `name`: The original identifier, or null if this information is not available.

```js
consumer.originalPositionFor({ line: 2, column: 10 })
// { source: 'foo.coffee',
//   line: 2,
//   column: 2,
//   name: null }

consumer.originalPositionFor({ line: 99999999999999999, column: 999999999999999 })
// { source: null,
//   line: null,
//   column: null,
//   name: null }
```

#### SourceMapConsumer.prototype.generatedPositionFor(originalPosition)

Returns the generated line and column information for the original source,
line, and column positions provided. The only argument is an object with
the following properties:

* `source`: The filename of the original source.

* `line`: The line number in the original source.  The line number is
  1-based.

* `column`: The column number in the original source.  The column
  number is 0-based.

and an object is returned with the following properties:

* `line`: The line number in the generated source, or null.  The line
  number is 1-based.

* `column`: The column number in the generated source, or null.  The
  column number is 0-based.

```js
consumer.generatedPositionFor({ source: "example.js", line: 2, column: 10 })
// { line: 1,
//   column: 56 }
```

#### SourceMapConsumer.prototype.allGeneratedPositionsFor(originalPosition)

Returns all generated line and column information for the original source, line,
and column provided. If no column is provided, returns all mappings
corresponding to a either the line we are searching for or the next closest line
that has any mappings. Otherwise, returns all mappings corresponding to the
given line and either the column we are searching for or the next closest column
that has any offsets.

The only argument is an object with the following properties:

* `source`: The filename of the original source.

* `line`: The line number in the original source.  The line number is
  1-based.

* `column`: Optional. The column number in the original source.  The
  column number is 0-based.

and an array of objects is returned, each with the following properties:

* `line`: The line number in the generated source, or null.  The line
  number is 1-based.

* `column`: The column number in the generated source, or null.  The
  column number is 0-based.

```js
consumer.allGeneratedpositionsfor({ line: 2, source: "foo.coffee" })
// [ { line: 2,
//     column: 1 },
//   { line: 2,
//     column: 10 },
//   { line: 2,
//     column: 20 } ]
```

#### SourceMapConsumer.prototype.hasContentsOfAllSources()

Return true if we have the embedded source content for every source listed in
the source map, false otherwise.

In other words, if this method returns `true`, then
`consumer.sourceContentFor(s)` will succeed for every source `s` in
`consumer.sources`.

```js
// ...
if (consumer.hasContentsOfAllSources()) {
  consumerReadyCallback(consumer);
} else {
  fetchSources(consumer, consumerReadyCallback);
}
// ...
```

#### SourceMapConsumer.prototype.sourceContentFor(source[, returnNullOnMissing])

Returns the original source content for the source provided. The only
argument is the URL of the original source file.

If the source content for the given source is not found, then an error is
thrown. Optionally, pass `true` as the second param to have `null` returned
instead.

```js
consumer.sources
// [ "my-cool-lib.clj" ]

consumer.sourceContentFor("my-cool-lib.clj")
// "..."

consumer.sourceContentFor("this is not in the source map");
// Error: "this is not in the source map" is not in the source map

consumer.sourceContentFor("this is not in the source map", true);
// null
```

#### SourceMapConsumer.prototype.eachMapping(callback, context, order)

Iterate over each mapping between an original source/line/column and a
generated line/column in this source map.

* `callback`: The function that is called with each mapping. Mappings have the
  form `{ source, generatedLine, generatedColumn, originalLine, originalColumn,
  name }`

* `context`: Optional. If specified, this object will be the value of `this`
  every time that `callback` is called.

* `order`: Either `SourceMapConsumer.GENERATED_ORDER` or
  `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to iterate over
  the mappings sorted by the generated file's line/column order or the
  original's source/line/column order, respectively. Defaults to
  `SourceMapConsumer.GENERATED_ORDER`.

```js
consumer.eachMapping(function (m) { console.log(m); })
// ...
// { source: 'illmatic.js',
//   generatedLine: 1,
//   generatedColumn: 0,
//   originalLine: 1,
//   originalColumn: 0,
//   name: null }
// { source: 'illmatic.js',
//   generatedLine: 2,
//   generatedColumn: 0,
//   originalLine: 2,
//   originalColumn: 0,
//   name: null }
// ...
```
### SourceMapGenerator

An instance of the SourceMapGenerator represents a source map which is being
built incrementally.

#### new SourceMapGenerator([startOfSourceMap])

You may pass an object with the following properties:

* `file`: The filename of the generated source that this source map is
  associated with.

* `sourceRoot`: A root for all relative URLs in this source map.

* `skipValidation`: Optional. When `true`, disables validation of mappings as
  they are added. This can improve performance but should be used with
  discretion, as a last resort. Even then, one should avoid using this flag when
  running tests, if possible.

```js
var generator = new sourceMap.SourceMapGenerator({
  file: "my-generated-javascript-file.js",
  sourceRoot: "http://example.com/app/js/"
});
```

#### SourceMapGenerator.fromSourceMap(sourceMapConsumer)

Creates a new `SourceMapGenerator` from an existing `SourceMapConsumer` instance.

* `sourceMapConsumer` The SourceMap.

```js
var generator = sourceMap.SourceMapGenerator.fromSourceMap(consumer);
```

#### SourceMapGenerator.prototype.addMapping(mapping)

Add a single mapping from original source line and column to the generated
source's line and column for this source map being created. The mapping object
should have the following properties:

* `generated`: An object with the generated line and column positions.

* `original`: An object with the original line and column positions.

* `source`: The original source file (relative to the sourceRoot).

* `name`: An optional original token name for this mapping.

```js
generator.addMapping({
  source: "module-one.scm",
  original: { line: 128, column: 0 },
  generated: { line: 3, column: 456 }
})
```

#### SourceMapGenerator.prototype.setSourceContent(sourceFile, sourceContent)

Set the source content for an original source file.

* `sourceFile` the URL of the original source file.

* `sourceContent` the content of the source file.

```js
generator.setSourceContent("module-one.scm",
                           fs.readFileSync("path/to/module-one.scm"))
```

#### SourceMapGenerator.prototype.applySourceMap(sourceMapConsumer[, sourceFile[, sourceMapPath]])

Applies a SourceMap for a source file to the SourceMap.
Each mapping to the supplied source file is rewritten using the
supplied SourceMap. Note: The resolution for the resulting mappings
is the minimum of this map and the supplied map.

* `sourceMapConsumer`: The SourceMap to be applied.

* `sourceFile`: Optional. The filename of the source file.
  If omitted, sourceMapConsumer.file will be used, if it exists.
  Otherwise an error will be thrown.

* `sourceMapPath`: Optional. The dirname of the path to the SourceMap
  to be applied. If relative, it is relative to the SourceMap.

  This parameter is needed when the two SourceMaps aren't in the same
  directory, and the SourceMap to be applied contains relative source
  paths. If so, those relative source paths need to be rewritten
  relative to the SourceMap.

  If omitted, it is assumed that both SourceMaps are in the same directory,
  thus not needing any rewriting. (Supplying `'.'` has the same effect.)

#### SourceMapGenerator.prototype.toString()

Renders the source map being generated to a string.

```js
generator.toString()
// '{"version":3,"sources":["module-one.scm"],"names":[],"mappings":"...snip...","file":"my-generated-javascript-file.js","sourceRoot":"http://example.com/app/js/"}'
```
