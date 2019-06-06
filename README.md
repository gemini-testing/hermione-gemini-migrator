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
                url: (code, argList) => {
                    return `
                        ${code.replace('url', 'customUrl')}
                        await browser.pause(500);
                    `;
                }
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
| `enebled` | `false` | Option for enable/disable the plugin. |
| `geminiConfig` | `'.gemini.js'` | Path to Gemini config. |
| `inputPatterns` | `'**/*.gemini.js'` | Patterns for searching gemini files. Read more: [fast-glob](https://github.com/mrmlnc/fast-glob)|
| `filePathReplacer` | `filePath => filePath.replace(/gemini/g, 'hermione')` | Function for replacing substring in test `filePath`. |
| `browserIdReplacer` | `browserId => browserId` | Function for replacing substring in `browserId`. |
| `commandReplacers` | `{}` | Object with functions for replacing default command to custom in hermione tests. |

## Licence

MIT
