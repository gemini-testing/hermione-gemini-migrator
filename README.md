# hermione-gemini-migrator

Plugin for [hermione](https://github.com/gemini-testing/hermione) for migration [gemini](https://github.com/gemini-testing/gemini) tests.

## Install

```
npm i -D hermione-gemini-migrator
```

## Usage

Set options for the plugin in your hermione config:
```js
module.exports = {
    // ...

    plugins: {
        'hermione-gemini-migrator': {
            enabled: false,
            filePathReplacer: filePath =>
                filePath
                    .replace('gemini.js', 'hermione.js')
                    .replace('gemini/test-suites', 'features'),
            browserIdReplacer: browserId => {
                switch(browserId) {
                    case 'ie11':
                        return 'edge-desktop'
                    default:
                        return browserId;
                }
            }
            commandReplacers: {
                url: code => code.replace(/url\((.*?)\);/, (match, p1) => {
                    return `customUrl(${JSON.stringify(qs.parse(url.parse(p1.replace(/\"/g, '')).query))})`;
                })
            },
            afterEach: (hermione) => {
                const {
                    inputSuite,
                    outputTestCollection,
                    inputFilePath,
                    outputFilePath,
                    inputScreenPaths,
                    outputScreenPaths,
                    config,
                    utils
                } = hermione.geminiMigrator;

                // Pring filepathh
                console.log(outputFilePath);

                // Print input test names
                utils.suiteWalker(inputSuite, suite => {
                    if (suite.url && !(suite.children && suite.children.length)) console.log(suite.fullName);
                });

                // Print output test names
                const testDict = {};

                outputTestCollection.eachTest(test => {
                    const fullName = test.fullTitle();

                    if (testDict[fullName]) return;
                    
                    testDict[fullName] = true;
                    console.log(fullName);
                });
            }
        }
    },

    // ...
}
```

Run hermione with cli option (if `enabled: false`):
```
npx hermione --gemini-migrate
```


## Options

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `false` | Option for enable/disable the plugin. |
| `geminiConfig` | `'.gemini.js'` | Path to Gemini config. |
| `inputPatterns` | `'**/*.gemini.js'` | Patterns for searching gemini files. Read more: [fast-glob](https://github.com/mrmlnc/fast-glob)|
| `filePathReplacer` | `filePath => filePath.replace(/gemini/g, 'hermione')` | Function for replacing substring in test `filePath`. |
| `browserIdReplacer` | `browserId => browserId` | Function for replacing substring in `browserId`. |
| `commandReplacers` | `{}` | Object with functions for replacing default command to custom in hermione tests. |
| `codeFormatter` | `code => code` | Function for formatting code before writting. For example: [prettier](https://github.com/prettier/prettier) |
| `before` | `hermione => {}` | Async or sync function that is called before writting all test files. |
| `beforeEach` | `hermione => {}` | Async or sync function that is called before writting each test file. |
| `afterEach` | `hermione => {}` | Async or sync function that is called after writting each test file. |
| `after` | `hermione => {}` | Async or sync function that is called after writting all test files. |

## Licence

MIT
