const _ = require('lodash');
const t = require('@babel/types');
const p = require('@babel/parser');

module.exports.describe = function(name, callbackBody) {
    return t.expressionStatement(
        t.callExpression(
            t.identifier('describe'),
            [
                t.stringLiteral(name),
                t.functionExpression(
                    null,
                    [],
                    t.blockStatement(callbackBody.filter(Boolean))
                )
            ]
        )
    );
};

module.exports.it = function(name, callbackBody) {
    return t.expressionStatement(
        t.callExpression(
            t.identifier('it'),
            [
                t.stringLiteral(name),
                t.functionExpression(
                    null,
                    [],
                    t.blockStatement([
                        t.variableDeclaration(
                            'const',
                            [
                                t.variableDeclarator(
                                    t.identifier('browser'),
                                    t.memberExpression(
                                        t.thisExpression(),
                                        t.identifier('browser')
                                    )
                                )
                            ]
                        ),
                        ...callbackBody.filter(Boolean)
                    ]),
                    false,
                    true
                )
            ]
        )
    );
};

module.exports.hermione = {
    skip: {
        in: function(browsers, comment) {
            return hermioneMethodStatement('skip.in', arguments);
        },
        notIn: function(browsers, comment) {
            return hermioneMethodStatement('skip.notIn', arguments);
        }
    },
    only: {
        in: function(browsers, comment) {
            return hermioneMethodStatement('only.in', arguments);
        },
        notIn: function(browsers, comment) {
            return hermioneMethodStatement('only.notIn', arguments);
        }
    }
};

module.exports.browser = {
    url: function(url) {
        return browserActionStatement('url', [
            t.stringLiteral(url)
        ]);
    },
    assertView: function(stateName, selectors, options) {
        const argList = [
            t.stringLiteral(stateName),
            parseExpression(selectors)
        ];

        if (options) {
            argList.push(parseExpression(options))
        }

        return browserActionStatement('assertView', argList);
    },
    pause: function(milliseconds) {
        return browserActionStatement('pause', [
            t.numericLiteral(milliseconds)
        ]);
    },
    waitForVisible: function(selector, timeout, reverse) {
        const argList = [
            t.stringLiteral(selector)
        ];

        if (timeout) {
            argList.push(t.numericLiteral(timeout))
        }

        if (reverse) {
            if (!timeout) {
                argList.push(t.numericLiteral(500))
            }

            argList.push(t.booleanLiteral(reverse))
        }

        return browserActionStatement('waitForVisible', argList);
    },
    customWaitForHidden: function(selector, timeout) {
        return withComment(
            'Wait for hidden',
            this.waitForVisible(selector, timeout, true)
        );
    },
    waitUntil: function(condition, timeout) {
        const argList = [
            parseExpression(normalizeCondition(condition))
        ];

        if (timeout) {
            argList.push(t.numericLiteral(timeout))
        }

        return browserActionStatement('waitUntil', argList);
    },
    click: function(selector) {
        return browserActionStatement('click', [
            t.stringLiteral(selector)
        ]);
    },
    doubleClick: function(selector) {
        return browserActionStatement('doubleClick', [
            t.stringLiteral(selector)
        ]);
    },
    customDragAndDrop: function(sourceSelector, destinationSelector) {
        return withComment('Drag and drop', [
            this.buttonDown(sourceSelector),
            this.moveToObject(destinationSelector),
            this.buttonUp()
        ]);
    },
    buttonDown: function(selector) {
        return [
            this.moveToObject(selector),
            browserActionStatement('buttonDown')
        ];
    },
    buttonUp: function(selector) {
        return [
            this.moveToObject(selector),
            browserActionStatement('buttonUp')
        ];
    },
    moveToObject: function(selector, offset) {
        const argList = [
            t.stringLiteral(selector)
        ];

        if (offset) {
            argList.push(t.numericLiteral(offset.x));
            argList.push(t.numericLiteral(offset.y));
        }

        return browserActionStatement('moveToObject', argList);
    },
    keys: function(keys) {
        return withComment(`Press keys: ${normalizeKeys(keys)}`, browserActionStatement('keys', [
            t.stringLiteral(keys)
        ]));
    },
    customKeyPress: function(selector, keys) {
        const keysArgList = String(keys ? keys : selector);
        const statements = [];

        if (keys) {
            statements.push(this.customFocus(selector));
        }

        statements.push(this.keys(keysArgList));

        return statements;
    },
    chooseFile: function(selector, localPath) {
        return browserActionStatement('chooseFile', [
            t.stringLiteral(selector),
            t.stringLiteral(localPath)
        ]);
    },
    customFocus: function(selector) {
        return withComment('Focus', this.execute(`
function() {
    document.querySelector('${selector}').focus();
}
        `));
    },
    customTap: function(selector) {
        return withComment('Tap', t.expressionStatement(parseExpression(`
await browser.element('${selector}')
    .then(elem => browser.touchAction(elem.value.ELEMENT, 'tap'))
        `)));
    },
    customFlick: function(offsets, speed, selector) {
        return withComment('Flick', t.expressionStatement(parseExpression(selector ? `
await browser.element('${selector}')
    .then(elem => browser.touchFlick(elem, ${offsets.x}, ${offsets.y}, ${speed}))
        ` : `
await browser.touchFlick(${offsets.x}, ${offsets.y}, ${speed}))
        `)));
    },
    execute: function(script) {
        return browserActionStatement('execute', [
            parseExpression(normalizeCondition(script)),
        ]);
    },
    setViewportSize: function(width, height) {
        return browserActionStatement('setViewportSize', [
            parseExpression(`{
                width: ${width},
                height: ${height}
            }`),
        ]);
    },
    customChangeOrientation: function(width, height) {
        return withComment('Change orientation', t.expressionStatement(parseExpression(`
await browser.getOrientation()
    .then(orientation => {
        return orientation && browser.setOrientation(orientation === 'landscape' ? 'portrait' : 'landscape')
    })
        `)));
    },
};

function hermioneMethodStatement(name, [browsers, comment]) {
    return t.expressionStatement(
        t.callExpression(
            memberChainExpression('hermione', ...name.split('.')),
            comment ? [
                parseExpression(normalizeBrowsers(browsers)),
                t.stringLiteral(comment)
            ] : [
                parseExpression(normalizeBrowsers(browsers))
            ]

        )
    );
};

function browserActionStatement(name, argList = []) {
    return t.expressionStatement(
        t.awaitExpression(
            t.callExpression(
                t.memberExpression(t.identifier('browser'), t.identifier(name)),
                argList
            )
        )
    );
};

function withComment(comment, value, type = 'leading') {
    const nodes = _.flattenDeep([].concat(value));

    if (t.isStatement(nodes[0])) {
        nodes[0].expression = t.addComment(nodes[0].expression, type, ` ${comment}`, 1);
    } else if (t.isExpression(nodes[0])) {
        nodes[0] = t.addComment(nodes[0], type, ` ${comment}`, 1);
    } else {
        return t.addComment(nodes[0], type, comment);
    }

    return nodes;
};

function parseExpression(value) {
    let stringifiedValue = value;

    if (!_.isString(value)) {
        stringifiedValue = JSON.stringify(value, function(key, value) {
            // babel don't parse regexp
            if (value instanceof RegExp) {
                return `$$(regexp)${value.toString()}$$`;
            }
            return value;
        });
    }

    return p.parseExpression(stringifiedValue, {
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true
    });
};

function memberChainExpression(...args) {
    if (args.length === 1) {
        return t.identifier(_.last(args));
    }

    return t.memberExpression(memberChainExpression(..._.initial(args)), t.identifier(_.last(args)));
};

function normalizeBrowsers(browsers) {
    return [].concat(browsers);
};

function normalizeCondition(condition) {
    // Clean window argument and comments
    const reqexp = /^function(.*?)\(window(,\s)?([\S\s.]*?)?(\/\*.*?\*\/)?\)|^\(window(,\s)?([\S\s.]*?)?(\/\*.*?\*\/)?\)([\s.]*?)?=>/gm;
    return condition.replace(reqexp, 'function ($3$6)');
};

function normalizeKeys(keys) {
    const dictionary = {
        '\uE000': 'Unidentified',
        '\uE001': 'Cancel',
        '\uE002': 'Help',
        '\uE003': 'Backspace',
        '\uE004': 'Tab',
        '\uE005': 'Clear',
        '\uE006': 'Return',
        '\uE007': 'Enter',
        '\uE008': 'Shift',
        '\uE009': 'Control',
        '\uE00A': 'Alt',
        '\uE00B': 'Pause',
        '\uE00C': 'Escape',
        '\uE00D': ' ',
        '\uE00E': 'PageUp',
        '\uE00F': 'PageDown',
        '\uE010': 'End',
        '\uE011': 'Home',
        '\uE012': 'ArrowLeft',
        '\uE013': 'ArrowUp',
        '\uE014': 'ArrowRight',
        '\uE015': 'ArrowDown',
        '\uE016': 'Insert',
        '\uE017': 'Delete',
        '\uE018': ';',
        '\uE019': '=',
        '\uE01A': '0',
        '\uE01B': '1',
        '\uE01C': '2',
        '\uE01D': '3',
        '\uE01E': '4',
        '\uE01F': '5',
        '\uE020': '6',
        '\uE021': '7',
        '\uE022': '8',
        '\uE023': '9',
        '\uE024': '*',
        '\uE025': '+',
        '\uE026': ',',
        '\uE027': '-',
        '\uE028': '.',
        '\uE029': '/',
        '\uE031': 'F1',
        '\uE032': 'F2',
        '\uE033': 'F3',
        '\uE034': 'F4',
        '\uE035': 'F5',
        '\uE036': 'F6',
        '\uE037': 'F7',
        '\uE038': 'F8',
        '\uE039': 'F9',
        '\uE03A': 'F10',
        '\uE03B': 'F11',
        '\uE03C': 'F12',
        '\uE03D': 'Meta',
        '\uE040': 'ZenkakuHankaku',
        '\uE050': 'Shift',
        '\uE051': 'Control',
        '\uE052': 'Alt',
        '\uE053': 'Meta',
        '\uE054': 'PageUp',
        '\uE055': 'PageDown',
        '\uE056': 'End',
        '\uE057': 'Home',
        '\uE058': 'ArrowLeft',
        '\uE059': 'ArrowUp',
        '\uE05A': 'ArrowRight',
        '\uE05B': 'ArrowDown',
        '\uE05C': 'Insert',
        '\uE05D': 'Delete'
    };

    return keys.split('').map(key => dictionary[key]).join(', ');
};
