(function () {
    'use strict';

    var ArrayUtils = Restsource.ArrayUtils;

    function isSet(obj) {
        return obj !== undefined && obj !== null;
    }

    function isBoolean(obj) {
        return typeof obj === 'boolean';
    }


    function getType(variable) {
        if (angular.isArray(variable)) {
            return 'array';
        }
        if (angular.isObject(variable)) {
            return 'object';
        }
        return 'primitive';
    }

    var PromiseExtensions = function (promise) {

        if (!promise || !angular.isFunction(promise.then)) {
            throw 'Invalid argument: not a promise';
        }

        if (promise instanceof PromiseExtensions) {
            return promise;
        }

        var _self = this;

        var _super = {
            then: promise.then,
            catch: promise.catch,
            finally: promise.finally,
            success: promise.success,
            error: promise.error

        };

        var _resolved;
        var _isResolved = false;

        angular.extend(this, promise);

        promise
            .then(function (results) {
                _resolved = results;
            })
            .finally(function () {
                _isResolved = true;
            });

        Object.defineProperty(this, '$resolved', {
            get: function () {
                return _resolved;
            }
        });

        Object.defineProperty(this, '$isResolved', {
            get: function () {
                return _isResolved;
            }
        });

        this.then = function () {
            return new PromiseExtensions(_super.then.apply(_self, arguments));
        };

        this.catch = function () {
            return new PromiseExtensions(_super.catch.apply(_self, arguments));
        };

        this.finally = function () {
            return new PromiseExtensions(_super.finally.apply(_self, arguments));
        };

        this.spread = function (callback, errback) {
            return _self.then(function (records) {
                return callback.apply(this, records);
            }, errback);
        };

        this.get = function (key) {
            return _self.then(function (res) {
                return res[key];
            });
        };

        /**
         * @param {String} methodName
         * @param {...*} parameters
         */
        this.invoke = function (methodName, parameters) {
            var args = ArrayUtils.toArray(arguments);
            args.shift();
            return _self.then(function (result) {
                if (!isSet(result)) {
                    return result;
                }
                var fn = result[methodName];
                if (!angular.isFunction(fn)) {
                    throw 'PromiseExtensions.invoke - Invalid argument: methodName does not reference a method';
                }
                return fn.apply(result, args);
            });
        };

        this.map = function () {
            var args = ['map'].concat(ArrayUtils.toArray(arguments));
            return _self.invoke.apply(_self, args);
        };

        this.filter = function () {
            var args = ['filter'].concat(ArrayUtils.toArray(arguments));
            return _self.invoke.apply(_self, args);
        };

        this.reduce = function () {
            var args = ['reduce'].concat(ArrayUtils.toArray(arguments));
            return _self.invoke.apply(_self, args);
        };

        this.sort = function () {
            var args = ['sort'].concat(ArrayUtils.toArray(arguments));
            return _self.invoke.apply(_self, args);
        };

        this.indexOf = function () {
            var args = ['indexOf'].concat(ArrayUtils.toArray(arguments));
            return _self.invoke.apply(_self, args);
        };

        this.index = function (property, transformer) {
            return ArrayUtils.createIndex(_self, property, transformer);
        };

        this.resolveTo = function (obj) {
            return PromiseExtensions.resolveTo(_self, obj);
        };

    };

    PromiseExtensions.extend = function (promise) {
        return new PromiseExtensions(promise);
    };

    PromiseExtensions.index = function (promise, property, transformer) {
        return PromiseExtensions.extend(promise).index(property, transformer);
    };

    PromiseExtensions.map = function (promise, transformer) {
        return PromiseExtensions.extend(promise).map(transformer);
    };

    PromiseExtensions.spread = function (promise, callback, errback) {
        return PromiseExtensions.extend(promise).spread(callback, errback);
    };

    /**
     * Merges the resolved promise value with the passed `obj`.
     *
     * By default:
     * - arrays are merged by pushing each item to the array obj
     * - objects are merged with `angular.extend`
     *
     * Pass a `mergeFn` define a custom merging strategy.
     *
     * @param promise Promise
     * @param obj Object
     */
    PromiseExtensions.resolveTo = function (promise, obj) {
        var objectType = getType(obj);
        if (objectType === 'primitive') {
            throw 'Invalid argument: resolved must be an object';
        }
        var mergePromise = PromiseExtensions.extend(promise).then(function (result) {
            var resultType = getType(result);

            switch ([objectType, resultType].join('<')) {
                case 'object<object':
                    angular.merge(obj, result);
                    break;

                case 'object<array':
                    result.forEach(function (item, index) {
                        obj[index] = item;
                    });
                    break;

                case 'object<primitive':
                    obj.toString = function () {
                        return result ? result.toString() : result;
                    };
                    obj.valueOf = function () {
                        return result;
                    };
                    break;

                case 'array<array':
                    result.forEach(function (item) {
                        obj.push(item);
                    });
                    break;

                case 'array<object':
                case 'array<primitive':
                    obj.push(result);
                    break;

                default:
                    return PromiseExtensions.reject('Failed to merge result to object instance');
            }
            return obj;
        });

        Object.defineProperties(obj, {
            $promise: {
                get: function () {
                    return mergePromise;
                }
            }
        });

        return obj;
    };

    PromiseExtensions.merge = function (obj, resolved) {
        if (ArrayUtils.isArrayLike(resolved) && ArrayUtils.isArrayLike(obj)) {
            obj.push.apply(obj, resolved);
            return obj;
        }
        if (angular.isObject(resolved) && angular.isObject(obj)) {
            angular.extend(obj, resolved);
            return obj;
        }
        return resolved;
    };

    PromiseExtensions.isResolvedTo = function (obj) {
        return ['$promise'].every(function (member) {
            return member in obj;
        });
    };

    angular.module('angular-restsource.promise-extensions', [])
        .factory('PromiseExtensions', ['$q', function ($q) {

            angular.forEach(['defer', 'reject'], function (delegateCall) {
                PromiseExtensions[delegateCall] = $q[delegateCall];
            });

            PromiseExtensions.all = function (promises) {
                return PromiseExtensions.extend($q.all(promises));
            };

            PromiseExtensions.when = function () {
                return PromiseExtensions.extend($q.when.apply($q, arguments));
            };

            PromiseExtensions.reject = function (obj) {
                return PromiseExtensions.extend($q.reject(obj));
            };

            return PromiseExtensions;
        }])
        .run(['PromiseExtensions', function (PromiseExtensions) {
            // make sure `PromiseExtensions.all` and etc are created
        }]);
}());
