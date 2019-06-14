'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');

const fsPromise = Promise.promisifyAll(fs);

exports.readFile = async (path) => {
    let data = '';

    try {
        data = await fsPromise.readFileAsync(path);
    } catch (e) {
        data = '';
    }

    return data.toString();
};

exports.requireWithNoCache = function(moduleName) {
    delete require.cache[moduleName];
    return require(moduleName);
};


exports.stringifyValue = function stringifyValue(value) {
    if (_.isFunction(value)) {
        return value.toString();
    } else if (_.isArray(value)) {
        return value.map(stringifyValue);
    }

    return value;
};

exports.createDir = function(dir) {
    (Array.isArray(dir) ? _(dir).map((i) => i.split('/')).flatten().value() : dir.split('/')).reduce((res, i) => {
        res.push(i);

        if(!fs.existsSync(path.join.apply(null, res))) {
            fs.mkdirSync(path.join.apply(null, res));
        }

        return res;
    }, []);
};

exports.suiteWalker = suiteWalker;

function suiteWalker(suite, callback) {
    callback(suite);

    if (suite.children) {
        suite.children.forEach(suite => suiteWalker(suite, callback));
    }
};
