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
            enabled: true
        }
    },

    // ...
}
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `enebled` | `false` | Option for enable/disable the plugin. |


## Licence

MIT
