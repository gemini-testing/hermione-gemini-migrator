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

            if ((_.isArray(value) || _.isFunction(value) || _.isObject(value)) && !_.isNull(value)) {
                const emmiterArgList = [target, key];

                proxyEmitter.emit(proxyEmitter.events.BEFORE_GET, this, emmiterArgList);

                const result = proxyValue.bind(this)(value);

                proxyEmitter.emit(proxyEmitter.events.AFTER_GET, this, emmiterArgList, result);

                return result;
            }
            
            return value;
        },
        apply(target, thisArg, argList) {
            const emmiterArgList = [target, thisArg, argList];
            const proxyArgList = argList.map(proxyValue.bind(this));

            proxyEmitter.emit(proxyEmitter.events.BEFORE_APPLY, this, emmiterArgList);

            const result = Reflect.apply(target, thisArg, proxyArgList);

            proxyEmitter.emit(proxyEmitter.events.AFTER_APPLY, this, emmiterArgList, result);

            return result;
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
