import { benchmark } from './benchmark-utils.js';
const [,, testModule, test, ...rest] = process.argv;

process.argv = [process.argv[0], testModule, ...rest];

import(testModule).then(({ tests }) => {
    benchmark(test, tests[test], tests.__getData)
        .then(res => {
            if (typeof process.send === 'function') {
                process.send(res);
            }
        });
});