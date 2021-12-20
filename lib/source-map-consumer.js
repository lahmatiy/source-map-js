import { ArraySet } from './array-set.js';
import { LEAST_UPPER_BOUND, search } from './binary-search.js';
import { decode } from './base64-vlq.js';
import { quickSort } from './quick-sort.js';
import {
  compareByGeneratedPositionsDeflatedNoLine,
  parseSourceMapInput,
  computeSourceURL,
  getArg,
  compareByOriginalPositions,
  normalize,
  isAbsolute,
  relative,
  compareByOriginalPositionsNoSource,
  compareByGeneratedPositionsDeflated,
  urlParse
} from './util.js';

/**
 * Provide the JIT with a nice shape / hidden class.
 */
class Mapping {
  constructor() {
    this.generatedLine = 0;
    this.generatedColumn = 0;
    this.source = null;
    this.originalLine = null;
    this.originalColumn = null;
    this.name = null;
  }
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
const compareGenerated = compareByGeneratedPositionsDeflatedNoLine;
function sortGenerated(array, start) {
  let l = array.length;
  let n = array.length - start;
  if (n <= 1) {
    return;
  } else if (n == 2) {
    let a = array[start];
    let b = array[start + 1];
    if (compareGenerated(a, b) > 0) {
      array[start] = b;
      array[start + 1] = a;
    }
  } else if (n < 20) {
    for (let i = start; i < l; i++) {
      for (let j = i; j > start; j--) {
        let a = array[j - 1];
        let b = array[j];
        if (compareGenerated(a, b) <= 0) {
          break;
        }
        array[j - 1] = b;
        array[j] = a;
      }
    }
  } else {
    quickSort(array, compareGenerated, start);
  }
}

const HACK = Symbol();
export class SourceMapConsumer {
  constructor(sourceMap, sourceMapURL) {
    this._version = 3; // The version of the source mapping spec that we are consuming.
    this.__generatedMappings = null;
    this.__originalMappings = null;
  
    if (sourceMap === HACK) {
      return;
    }

    if (typeof sourceMap === 'string') {
      sourceMap = parseSourceMapInput(sourceMap);
    }

    return sourceMap.sections != null
      ? new IndexedSourceMapConsumer(sourceMap, sourceMapURL)
      : new BasicSourceMapConsumer(sourceMap, sourceMapURL);
  }

  static fromSourceMap(sourceMap, sourceMapURL) {
    return BasicSourceMapConsumer.fromSourceMap(sourceMap, sourceMapURL);
  }

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  get _generatedMappings() {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }

  get _originalMappings() {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }

  _charIsMappingSeparator(str, index) {
    const c = str.charAt(index);
    return c === ";" || c === ",";
  }

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
  _parseMappings(/* aStr, aSourceRoot */) {
    throw new Error("Subclasses must implement _parseMappings");
  }

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param {Function} callback
   *        The function that is called with each mapping.
   * @param {Object} context
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `callback` is called.
   * @param order
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  eachMapping(callback, context = null, order = SourceMapConsumer.GENERATED_ORDER) {
    let mappings;

    switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
    }

    const sourceRoot = this.sourceRoot;
    const boundCallback = callback.bind(context);
    const names = this._names;
    const sources = this._sources;
    const sourceMapURL = this._sourceMapURL;

    for (const mapping of mappings) {
      let source = mapping.source === null ? null : sources.at(mapping.source);
      source = computeSourceURL(sourceRoot, source, sourceMapURL);
      boundCallback({
        source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : names.at(mapping.name)
      });
    }
  }

  /**
   * Returns all generated line and column information for the original source,
   * line, and column provided. If no column is provided, returns all mappings
   * corresponding to a either the line we are searching for or the next
   * closest line that has any mappings. Otherwise, returns all mappings
   * corresponding to the given line and either the column we are searching for
   * or the next closest column that has any offsets.
   *
   * The only argument is an object with the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.  The line number is 1-based.
   *   - column: Optional. the column number in the original source.
   *    The column number is 0-based.
   *
   * and an array of objects is returned, each with the following properties:
   *
   *   - line: The line number in the generated source, or null.  The
   *    line number is 1-based.
   *   - column: The column number in the generated source, or null.
   *    The column number is 0-based.
   */
  allGeneratedPositionsFor(args) {
    const line = getArg(args, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    const needle = {
      source: getArg(args, 'source'),
      originalLine: line,
      originalColumn: getArg(args, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    const mappings = [];

    let index = this._findMapping(
      needle,
      this._originalMappings,
      'originalLine',
      'originalColumn',
      compareByOriginalPositions,
      LEAST_UPPER_BOUND
    );

    if (index >= 0) {
      let mapping = this._originalMappings[index];

      if (args.column === undefined) {
        const originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: getArg(mapping, 'generatedLine', null),
            column: getArg(mapping, 'generatedColumn', null),
            lastColumn: getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        const originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (
          mapping &&
          mapping.originalLine === line &&
          mapping.originalColumn == originalColumn
        ) {
          mappings.push({
            line: getArg(mapping, 'generatedLine', null),
            column: getArg(mapping, 'generatedColumn', null),
            lastColumn: getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  }
}

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
export class BasicSourceMapConsumer extends SourceMapConsumer {
  constructor(sourceMap, sourceMapURL) {
    super(HACK);

    if (typeof sourceMap === 'string') {
      sourceMap = parseSourceMapInput(sourceMap);
    }

    const version = getArg(sourceMap, 'version');
    let sources = getArg(sourceMap, 'sources');
    let sourceRoot = getArg(sourceMap, 'sourceRoot', null);
    const sourcesContent = getArg(sourceMap, 'sourcesContent', null);
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    const names = getArg(sourceMap, 'names', []);
    const mappings = getArg(sourceMap, 'mappings');
    const file = getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    if (sourceRoot) {
      sourceRoot = normalize(sourceRoot);
    }

    sources = sources
      .map(String)
      // Some source maps produce relative source paths like "./foo.js" instead of
      // "foo.js".  Normalize these first so that future comparisons will succeed.
      // See bugzil.la/1090768.
      .map(normalize)
      // Always ensure that absolute sources are internally stored relative to
      // the source root, if the source root is absolute. Not doing this would
      // be particularly problematic when the source root is a prefix of the
      // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
      .map((source) =>
        sourceRoot && isAbsolute(sourceRoot) && isAbsolute(source)
          ? relative(sourceRoot, source)
          : source
      );

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names.map(String), true);
    this._sources = ArraySet.fromArray(sources, true);

    this._absoluteSources = this._sources.toArray().map((source) =>
      computeSourceURL(sourceRoot, source, sourceMapURL)
    );

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this._sourceMapURL = sourceMapURL;
    this.file = file;
  }

  /**
   * Utility function to find the index of a source.  Returns -1 if not
   * found.
   */
  _findSourceIndex(source) {
    let relativeSource = source;

    if (this.sourceRoot != null) {
      relativeSource = relative(this.sourceRoot, relativeSource);
    }

    if (this._sources.has(relativeSource)) {
      return this._sources.indexOf(relativeSource);
    }

    // Maybe source is an absolute URL as returned by |sources|.  In
    // this case we can't simply undo the transform.
    for (let i = 0; i < this._absoluteSources.length; ++i) {
      if (this._absoluteSources[i] == source) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Create a BasicSourceMapConsumer from a SourceMapGenerator.
   *
   * @param {SourceMapGenerator} aSourceMap The source map that will be consumed.
   * @param {String} aSourceMapURL The URL at which the source map can be found (optional)
   * @returns {BasicSourceMapConsumer}
   */
  static fromSourceMap(aSourceMap, aSourceMapURL) {
    const smc = Object.create(BasicSourceMapConsumer.prototype);
    const names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    const sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map((source) =>
      computeSourceURL(smc.sourceRoot, source, aSourceMapURL)
    );

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    const generatedMappings = aSourceMap._mappings.toArray().slice();
    const destGeneratedMappings = smc.__generatedMappings = [];
    const destOriginalMappings = smc.__originalMappings = [];

    for (const srcMapping of generatedMappings) {
      const destMapping = new Mapping();

      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, compareByOriginalPositions);

    return smc;
  }

  /**
   * The list of original sources.
   */
  get sources() {
    return this._absoluteSources.slice();
  }

  _parseMappings(aStr) {
    const strLength = aStr.length;
    const originalMappings = [];
    const generatedMappings = [];
    const temp = {};
    let generatedLine = 1;
    let previousGeneratedColumn = 0;
    let previousOriginalLine = 0;
    let previousOriginalColumn = 0;
    let previousSource = 0;
    let previousName = 0;
    let index = 0;
    let mapping, segment, end, value;

    let subarrayStart = 0;
    while (index < strLength) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;

        sortGenerated(generatedMappings, subarrayStart);
        subarrayStart = generatedMappings.length;
      } else if (aStr.charAt(index) === ',') {
        index++;
      } else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        for (end = index; end < strLength; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }

        segment = [];
        while (index < end) {
          decode(aStr, index, temp);
          value = temp.value;
          index = temp.rest;
          segment.push(value);
        }

        if (segment.length === 2) {
          throw new Error('Found a source, but no line and column');
        }

        if (segment.length === 3) {
          throw new Error('Found a source and line, but no column');
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          let currentSource = mapping.source;

          while (originalMappings.length <= currentSource) {
            originalMappings.push(null);
          }

          if (originalMappings[currentSource] === null) {
            originalMappings[currentSource] = [];
          }

          originalMappings[currentSource].push(mapping);
        }
      }
    }

    sortGenerated(generatedMappings, subarrayStart);
    this.__generatedMappings = generatedMappings;

    for (const mappings of originalMappings) {
      if (mappings != null) {
        quickSort(mappings, compareByOriginalPositionsNoSource);
      }
    }

    this.__originalMappings = [].concat(...originalMappings);
  }

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  _findMapping(needle, mappings, lineName, columnName, comparator, bias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (needle[lineName] <= 0) {
      throw new TypeError(`Line must be greater than or equal to 1, got ${needle[lineName]}`);
    }

    if (needle[columnName] < 0) {
      throw new TypeError(`Column must be greater than or equal to 0, got ${needle[columnName]}`);
    }

    return search(needle, mappings, comparator, bias);
  }

  /**
   * Compute the last column for each generated mapping. The last column is
   * inclusive.
   */
  computeColumnSpans() {
    const generatedMappings = this._generatedMappings;

    for (let index = 0; index < generatedMappings.length; ++index) {
      const mapping = generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < generatedMappings.length) {
        const nextMapping = generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  }

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.  The line number
   *     is 1-based.
   *   - column: The column number in the generated source.  The column
   *     number is 0-based.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the original source, or null.  The
   *     column number is 0-based.
   *   - name: The original identifier, or null.
   */
  originalPositionFor(args) {
    const needle = {
      generatedLine: getArg(args, 'line'),
      generatedColumn: getArg(args, 'column')
    };

    const index = this._findMapping(
      needle,
      this._generatedMappings,
      'generatedLine',
      'generatedColumn',
      compareByGeneratedPositionsDeflated,
      getArg(args, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      const mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        let source = getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }

        let name = getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }

        return {
          source: source,
          line: getArg(mapping, 'originalLine', null),
          column: getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  }

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }

    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some((sc) => sc == null);
  }

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * available.
   */
  sourceContentFor(source, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    const index = this._findSourceIndex(source);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    let relativeSource = source;
    let url = null;

    if (this.sourceRoot != null) {
      relativeSource = relative(this.sourceRoot, relativeSource);
      url = urlParse(this.sourceRoot);
    }

    if (this.sourceRoot != null && url) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      const fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }

    throw new Error('"' + relativeSource + '" is not in the SourceMap.');
  }

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.  The line number
   *     is 1-based.
   *   - column: The column number in the original source.  The column
   *     number is 0-based.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the generated source, or null.
   *     The column number is 0-based.
   */
  generatedPositionFor(args) {
    let source = this._findSourceIndex(getArg(args, 'source'));

    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    const needle = {
      source,
      originalLine: getArg(args, 'line'),
      originalColumn: getArg(args, 'column')
    };

    const index = this._findMapping(
      needle,
      this._originalMappings,
      'originalLine',
      'originalColumn',
      compareByOriginalPositions,
      getArg(args, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      const mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: getArg(mapping, 'generatedLine', null),
          column: getArg(mapping, 'generatedColumn', null),
          lastColumn: getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  }
};

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version: 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version: 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found. This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
export class IndexedSourceMapConsumer extends SourceMapConsumer {
  constructor(sourceMap, sourceMapURL) {
    super(HACK);
  
    if (typeof sourceMap === 'string') {
      sourceMap = parseSourceMapInput(sourceMap);
    }

    const version = getArg(sourceMap, 'version');
    const sections = getArg(sourceMap, 'sections');

    this._sources = new ArraySet();
    this._names = new ArraySet();

    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    let lastOffset = {
      line: -1,
      column: 0
    };

    this._sections = sections.map((section) => {
      if (section.url) {
        // The url field will require support for asynchronicity.
        // See https://github.com/mozilla/source-map/issues/16
        throw new Error('Support for url field in sections not implemented.');
      }

      const offset = getArg(section, 'offset');
      const offsetLine = getArg(offset, 'line');
      const offsetColumn = getArg(offset, 'column');

      if (offsetLine < lastOffset.line ||
          (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
        throw new Error('Section offsets must be ordered and non-overlapping.');
      }

      lastOffset = offset;

      return {
        generatedOffset: {
          // The offset fields are 0-based, but we use 1-based indices when
          // encoding/decoding from VLQ.
          generatedLine: offsetLine + 1,
          generatedColumn: offsetColumn + 1
        },
        consumer: new SourceMapConsumer(getArg(section, 'map'), sourceMapURL)
      }
    });
  }

  /**
   * The list of original sources.
   */
  get sources() {
    const sources = [];

    for (let i = 0; i < this._sections.length; i++) {
      for (let j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }

    return sources;
  }

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.  The line number
   *     is 1-based.
   *   - column: The column number in the generated source.  The column
   *     number is 0-based.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the original source, or null.  The
   *     column number is 0-based.
   *   - name: The original identifier, or null.
   */
  originalPositionFor(aArgs) {
    const needle = {
      generatedLine: getArg(aArgs, 'line'),
      generatedColumn: getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    const sectionIndex = search(needle, this._sections, (needle, section) =>
      needle.generatedLine - section.generatedOffset.generatedLine ||
      needle.generatedColumn - section.generatedOffset.generatedColumn
    );

    const section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  }

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  hasContentsOfAllSources() {
    return this._sections.every((section) =>
      section.consumer.hasContentsOfAllSources()
    );
  }

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * available.
   */
  sourceContentFor(source, nullOnMissing) {
    for (let i = 0; i < this._sections.length; i++) {
      const section = this._sections[i];

      const content = section.consumer.sourceContentFor(source, true);
      if (content) {
        return content;
      }
    }

    if (nullOnMissing) {
      return null;
    }

    throw new Error('"' + source + '" is not in the SourceMap.');
  };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.  The line number
   *     is 1-based.
   *   - column: The column number in the original source.  The column
   *     number is 0-based.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.  The
   *     line number is 1-based. 
   *   - column: The column number in the generated source, or null.
   *     The column number is 0-based.
   */
  generatedPositionFor(args) {
    const source = getArg(args, 'source');

    for (const section of this._sections) {
      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(source) === -1) {
        continue;
      }

      const generatedPosition = section.consumer.generatedPositionFor(args);
      if (generatedPosition) {
        return {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
      }
    }

    return {
      line: null,
      column: null
    };
  };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  _parseMappings() {
    this.__generatedMappings = [];
    this.__originalMappings = [];

    for (const section of this._sections) {
      for (const mapping of section.consumer._generatedMappings) {
        let source = section.consumer._sources.at(mapping.source);
        source = computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        let name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        const adjustedMapping = {
          source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, compareByOriginalPositions);
  }
}
