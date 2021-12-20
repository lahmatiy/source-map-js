import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import esMain from 'es-main';
import * as self from '../lib/index.js';
import sourceMapJS from 'source-map-js';
import sourceMapV6 from 'source-map-v6';
import sourceMapV7 from 'source-map-v7';
import sourceMapNext from 'source-map-next';
import { runBenchmark, prettySize, outputToReadme, updateReadmeTable } from './utils/benchmark-utils.js';

const benchmarkName = 'consume-source-map';
const fixtures = [
    './fixtures/self.json',           // ~257Kb
    './fixtures/angular-min.json',    // ~430Kb
    './fixtures/scalajs-runtime.json' // ~16Mb
];
const fixtureIndex = process.argv[2] || 0;
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const filename = fixtureIndex in fixtures ? path.join(__dirname, fixtures[fixtureIndex]) : false;

if (!filename) {
    console.error('Fixture is not selected!');
    console.error();
    console.error('Run script:', chalk.green(`node ${path.relative(process.cwd(), process.argv[1])} [fixture]`));
    console.error();
    console.error(`where ${chalk.yellow('[fixture]')} is a number:`);
    fixtures.forEach((fixture, idx) =>
        console.log(idx, fixture)
    );
    process.exit();
}

const libFactory = (lib) => {
    return async (data) => {
        const consumer = await new lib.SourceMapConsumer(data);
        // let count = 0;
        // consumer.eachMapping((...a) => { count++; if (count === 1000) console.log(a) });
        // const result = 
        consumer.originalPositionFor({
            line: 653,
            column: 20
        });
        // console.log(result);
    }
};

export const tests = {
    'Current': libFactory(self),
    'source-map-js v1.0': libFactory(sourceMapJS),
    'source-map v0.6': libFactory(sourceMapV6),
    'source-map v0.7': libFactory(sourceMapV7),
    'source-map next': libFactory(sourceMapNext)
};

Object.defineProperty(tests, '__getData', {
    value: () => JSON.parse(fs.readFileSync(filename))
});

if (esMain(import.meta)) {
    run();
}

//
// Run benchmarks
//
async function run() {
    if (!fs.existsSync(filename)) {
        // auto-generate fixture
        let [, num, unit] = filename.match(/(\d+)([a-z]+).json/);
        const times = unit === 'mb' ? num / 100 : num * 10;

        await require('./gen-fixture')(times, filename);
    }

    if (process.env.README) {
        outputToReadme(benchmarkName, fixtureIndex);
    }

    console.log('Benchmark:', chalk.green('new SourceMapConsumer()'));
    console.log('Node version:', chalk.green(process.versions.node));
    console.log('Fixture:',
        chalk.green(path.relative(process.cwd(), filename)),
        chalk.yellow(prettySize(fs.statSync(filename).size))
    );
    console.log();

    const results = [];
    for (const name of Object.keys(tests)) {
        results.push(await runBenchmark(import.meta.url, name));
    }

    if (process.env.README) {
        updateReadmeTable(benchmarkName, fixtureIndex, fixtures, results);
    }
}