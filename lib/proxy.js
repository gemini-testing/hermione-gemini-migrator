const _ = require('lodash');
const DeepProxy = require('proxy-deep');
const EventEmitter = require('events');

const events = {
    BEFORE_GET: 'before-get',
    AFTER_GET: 'after-get',
    BEFORE_APPLY: 'before-apply',
    AFTER_APPLY: 'after-apply'
};

module.exports = (proxyTarget, proxyCallback, geminiAPI) => {
    const proxyEmitter = new EventEmitter();

    proxyEmitter.events = events;

    const proxy = new DeepProxy(proxyTarget, {
        get(target, key, receiver) {
            const desc = Object.getOwnPropertyDescriptor(target, key);
            const value = Reflect.get(target, key, receiver);

            if (desc && !desc.writable && !desc.configurable) {
                return value;
            }

            if ((_.isArray(value) || _.isFunction(value) || _.isObject(value)) && !_.isNull(value) && _.isString(key)) {
                const emmiterArgList = [target, key];
                let ctx = {};

                proxyEmitter.emit(proxyEmitter.events.BEFORE_GET, this, emmiterArgList, ctx);

                ctx.result = proxyValue.bind(this)(value);

                proxyEmitter.emit(proxyEmitter.events.AFTER_GET, this, emmiterArgList, ctx);

                return ctx.result;
            }

            return value;
        },
        apply(target, thisArg, argList) {
            const emmiterArgList = [target, thisArg, argList];
            const proxyArgList = argList.map(proxyValue.bind(this));
            let ctx = {};

            proxyEmitter.emit(proxyEmitter.events.BEFORE_APPLY, this, emmiterArgList, ctx);

            if (!ctx.skip) {
                ctx.result = proxyValue.bind(this)(Reflect.apply(target, thisArg, proxyArgList));
            } else {
                ctx.skip = false;
            }

            ctx.oldResult = ctx.result;

            proxyEmitter.emit(proxyEmitter.events.AFTER_APPLY, this, emmiterArgList, ctx);

            if (ctx.result !== ctx.oldResult) {
                ctx.result = proxyValue.bind(this)(ctx.result);
            }

            return ctx.result;
        }
    });

    proxyCallback(proxyEmitter, geminiAPI);

    return proxy;
};

function proxyValue(value) {
    if ((_.isFunction(value) || _.isObject(value)) && !_.isRegExp(value) && !_.isNull(value)) {
        if (value.name === 'call' || value.name === 'toString' || value.name === 'valueOf') {
            return value;
        }

        return this.nest(value);
    }

    if (_.isArray(value)) {
        return value.map(proxyValue.bind(this));
    }

    return value;
};
