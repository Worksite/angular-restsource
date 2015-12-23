/**! 
 * angular-restsource v0.3.2
 * Copyright (c) 2013 Ares Project Management LLC <code@prismondemand.com>
 */
(function () {
    'use strict';

    /**
     * @param {String} rootUrl
     * @param {Object} [options]
     * @param $http
     * @param $q
     * @param $parse
     * @param $log
     * @param PromiseExtensions
     * @constructor
     */
    var Restsource = function (rootUrl, options, $http, $q, $parse, $log, PromiseExtensions) {
        var _opts = angular.extend({
            idField: 'id',
            responseInterceptors: [],
            httpConfig: {},
            verbs: {},
            pathParams: {}
        }, options);

        var _self = this;

        function _defaultCfg(cfg) {
            return angular.extend({}, _opts.httpConfig, cfg);
        }

        function _interceptRequest(initialConfig) {
            return _opts.responseInterceptors.reduce(function (config, requestInterceptor) {
                try {
                    return angular.isFunction(requestInterceptor.request) ? requestInterceptor.request(config) : config;
                } catch (e) {
                    $log.error(e);
                    return config;
                }
            }, initialConfig);
        }

        function _interceptResponse(initialHttpPromise) {
            var httpPromise = _opts.responseInterceptors.reduce(function (httpPromise, responseInterceptor) {
                // handle old HTTP response interceptors
                if (angular.isFunction(responseInterceptor)) {
                    return responseInterceptor(httpPromise);
                }
                // handle new HTTP response interceptors
                if (angular.isFunction(responseInterceptor.response)) {
                    return httpPromise.then(responseInterceptor.response);
                }
                $log.warn('**** invalid response interceptor');
                return httpPromise;
            }, initialHttpPromise);

            httpPromise.success = function (fn) {
                initialHttpPromise.then(function (response) {
                    var data = response.data || {};
                    fn(data.body, response.status, response.headers, response.config);
                });
                return _self;
            };

            httpPromise.error = function (fn) {
                initialHttpPromise.then(null, function (response) {
                    var data = response.data || {};
                    fn(data.error || {}, response.status, response.headers, response.config);
                });
                return _self;
            };

            return httpPromise;
        }

        Object.defineProperty(this, 'rootUrl', {
            get: function () {
                return rootUrl;
            }
        });

        Object.defineProperty(this, 'options', {
            get: function () {
                return _opts;
            }
        });

        function interpolateUrl(url, pathParams) {
            if (!url) {
                return url;
            }
            var matches = url.match(/{{[\w_\.]+}}/g);
            if (!matches) {
                return url;
            }
            var params = angular.extend({}, _opts.pathParams, pathParams);
            return matches.reduce(function (url, match) {
                var field = match.replace(/[\{\}]+/g, '');
                var value = $parse(field)(params);
                return url.replace(match, angular.isFunction(value) ? value() : value);
            }, url);
        }

        // Create verb methods
        angular.forEach(_opts.verbs, function (verb, name) {
            _self[name] = function () {
                var config = _defaultCfg(verb.apply(_self, arguments));
                config.url = interpolateUrl(rootUrl + config.url, config.pathParams);
                return PromiseExtensions.extend(_interceptResponse($http(_interceptRequest(config))));
            };
        });

        this.save = function (record, cfg) {
            return record[_opts.idField] ? _self.update(record, _defaultCfg(cfg)) : _self.create(record, _defaultCfg(cfg));
        };

        this.clone = function (opts) {
            return new Restsource(rootUrl, angular.extend({}, _opts, opts), $http, $q, $parse, $log, PromiseExtensions);
        };
    };

    angular.module('angular-restsource', ['angular-restsource.promise-extensions']).config(['$provide', function ($provide) {

        $provide.provider('restsource', function () {

            var _self = this;
            var _globalOptions = {
                idField: 'id',
                httpConfig: {},
                verbs: {},
                responseInterceptors: [],
                pathParams: {}
            };
            var _globalUseBodyResponseInterceptor = true;
            var _globalDefaultLimits = {
                page: 1,
                perPage: 25
            };

            this.idField = function (fieldName) {
                _globalOptions.idField = fieldName;
                return _self;
            };

            this.httpConfig = function (config) {
                _globalOptions.httpConfig = config;
                return _self;
            };

            this.defaultListLimits = function (page, perPage) {
                _globalDefaultLimits = {
                    page: page,
                    perPage: perPage
                };
                return _self;
            };

            this.useBodyResponseInterceptor = function (enable) {
                _globalUseBodyResponseInterceptor = enable;
                return _self;
            };

            this.addResponseInterceptor = function (interceptor) {
                _globalOptions.responseInterceptors.push(interceptor);
                return _self;
            };

            this.pathParams = function (pathParams) {
                _globalOptions.pathParams = pathParams;
                return _self;
            };

            this.provide = function (name, url) {

                return $provide.provider(name, function () {
                    var _self = this;
                    var _options = angular.copy(_globalOptions);
                    var _useBodyResponseInterceptor = angular.copy(_globalUseBodyResponseInterceptor);
                    var _defaultListLimits = angular.copy(_globalDefaultLimits);

                    this.idField = function (fieldName) {
                        _options.idField = fieldName;
                        return _self;
                    };

                    this.httpConfig = function (config) {
                        _options.httpConfig = config;
                        return _self;
                    };

                    this.defaultListLimits = function (page, perPage) {
                        _defaultListLimits = {
                            page: page,
                            perPage: perPage
                        };
                        return _self;
                    };

                    this.useBodyResponseInterceptor = function (enable) {
                        _useBodyResponseInterceptor = enable;
                        return _self;
                    };

                    this.addResponseInterceptor = function (interceptor) {
                        _options.responseInterceptors.push(interceptor);
                        return _self;
                    };

                    this.pathParams = function (pathParams) {
                        _options.pathParams = pathParams;
                        return _self;
                    };

                    this.verb = function (verbName, request) {
                        var args = Array.prototype.slice.call(arguments);
                        if (!angular.isFunction(request)) {
                            throw 'Invalid argument: invalid request fn for `' + name + ':' + verbName + '`';
                        }
                        _options.verbs[verbName] = request;
                        return _self;
                    };

                    this.verb('create', function (record, cfg) {
                        return angular.extend({
                            method: 'POST',
                            url: '',
                            pathParams: record,
                            data: record
                        }, cfg);
                    });

                    this.verb('read', function (id, cfg) {
                        return angular.extend({
                            method: 'GET',
                            url: '/{{id}}',
                            pathParams: {
                                id: id
                            }
                        }, cfg);
                    });

                    this.verb('update', function (record, cfg) {
                        return angular.extend({
                            method: 'PUT',
                            url: '/{{id}}',
                            pathParams: record,
                            data: record
                        }, cfg);
                    });

                    this.verb('list', function (page, perPage, cfg) {
                        return angular.extend({
                            method: 'GET',
                            url: '',
                            params: {
                                page: page || _defaultListLimits.page,
                                perPage: perPage || _defaultListLimits.perPage
                            }
                        }, cfg);
                    });

                    this.verb('delete', function (id, cfg) {
                        return angular.extend({
                            method: 'DELETE',
                            url: '/{{id}}',
                            pathParams: angular.isObject(id) ? id : {
                                id: id
                            },
                            data: angular.isObject(id) ? id : undefined
                        }, cfg);
                    });

                    this.$get = function ($injector, restsource) {
                        var opts = angular.copy(_options);
                        if (_useBodyResponseInterceptor) {
                            opts.responseInterceptors.unshift('bodyResponseInterceptor');
                        }
                        opts.responseInterceptors = opts.responseInterceptors.map(function (interceptor) {
                            if (angular.isString(interceptor)) {
                                return $injector.get(interceptor);
                            }
                            if (angular.isFunction(interceptor) || angular.isArray(interceptor)) {
                                return $injector.invoke(interceptor);
                            }
                            return interceptor;
                        });
                        if (angular.isString(opts.pathParams) || angular.isFunction(opts.pathParams) || angular.isArray(opts.pathParams)) {
                            opts.pathParams = angular.isString(opts.pathParams) ? $injector.get(opts.pathParams) : $injector.invoke(opts.pathParams);
                        }
                        return restsource(url, opts);
                    };
                    this.$get.$inject = ['$injector', 'restsource'];
                });

            };

            this.$get = function ($http, $q, $parse, $log, PromiseExtensions) {
                return function (url, cfg) {
                    return new Restsource(url, cfg, $http, $q, $parse, $log, PromiseExtensions);
                };
            };
            this.$get.$inject = ['$http', '$q', '$parse', '$log', 'PromiseExtensions'];

        });

        $provide.factory('bodyResponseInterceptor', ['$q', function ($q) {
            return {
                response: function (response) {
                    var data = response.data || {};
                    if (data.error || data.body === undefined) {
                        return $q.reject(response);
                    }
                    return data.body;
                }
            };
        }]);

    }]);

})();

(function (exports) {
    'use strict';

    var NODE_TYPE_ELEMENT = 1;

    function isWindow(obj) {
        return obj && obj.window === obj;
    }

    var ArrayUtils = {

        createIndex: function (array, property, transformer) {
            return array.reduce(function (index, record) {
                var key = angular.isFunction(property) ? property(record) : record[property];
                index[key] = angular.isFunction(transformer) ? transformer(record) : record;
                return index;
            }, {});
        },

        /**
         * Avoid leaking arguments which prevents optimizations in JavaScript engines.
         * See https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
         * @param {Arguments|Array} arrayLike
         * @returns {Array}
         */
        toArray: function (arrayLike) {
            var args = new Array(arrayLike.length);
            for (var i = 0; i < args.length; ++i) {
                args[i] = arrayLike[i];
            }
            return args;
        },

        // pulled from angular 1.4.4
        isArrayLike: function (obj) {
            if (obj === null || obj === undefined || isWindow(obj)) {
                return false;
            }

            // Support: iOS 8.2 (not reproducible in simulator)
            // "length" in obj used to prevent JIT error (gh-11508)
            var length = 'length' in Object(obj) && obj.length;

            if (obj.nodeType === NODE_TYPE_ELEMENT && length) {
                return true;
            }

            return angular.isString(obj) || angular.isArray(obj) || length === 0 ||
                typeof length === 'number' && length > 0 && (length - 1) in obj;
        }
    };

    /**
     * @Class ArrayCache
     * An array-like structure with CRUD methods
     * @param records
     * @param primaryIdField
     * @constructor
     */
    var ArrayCache = function (records, primaryIdField) {
        var _self = this;
        var _records = [];
        var _primaryIdField = primaryIdField || 'id';
        var _indexes = {};

        _indexes[_primaryIdField] = {};

        function _addRecordToIndexes(record) {
            return Object.keys(_indexes).reduce(function (exits, property) {
                var index = _indexes[property];
                var key = record[property];
                var value = index[key];
                if (!value) {
                    index[key] = record;
                    return exits;
                }
                return true;
            }, false);
        }

        ['forEach', 'map', 'filter', 'reduce', 'sort', 'indexOf'].forEach(function (method) {
            _self[method] = function () {
                return _records[method].apply(_records, arguments);
            };
        });

        Object.defineProperty(this, 'length', {
            get: function () {
                return _records.length;
            },
            set: function (length) {
                var numToRemove = _records.length - length;
                if (numToRemove <= 0) {
                    return;
                }
                _records.splice(length, numToRemove).forEach(_self.remove);
            }
        });

        this.read = function (id) {
            return _indexes[_primaryIdField] ? _indexes[_primaryIdField][id] : null;
        };

        this.get = function (index) {
            return _records[index];
        };

        this.save = function (record) {
            if (arguments.length > 1) {
                return _self.save(ArrayUtils.toArray(arguments));
            }
            if (angular.isArray(record)) {
                return record.map(function (r) {
                    return _self.save(r);
                });
            }
            var primaryId = record[_primaryIdField];
            if (primaryId === null || primaryId === undefined) {
                throw 'ArrayCache::save: record has no primary id';
            }
            var existing = _self.read(primaryId);
            _addRecordToIndexes(record);
            if (existing) {
                angular.extend(existing, record);
                return existing;
            } else {
                _records.push(record);
                return record;
            }
        };

        this.push = this.save;


        this.remove = function (recordOrId) {
            if (angular.isArray(recordOrId)) {
                return recordOrId.map(_self.remove);
            }

            var record = _self.read(recordOrId) || _self.read(recordOrId[_primaryIdField]);
            if (!record) {
                return undefined;
            }
            angular.forEach(_indexes, function (index, property) {
                var key = record[property];
                delete index[key];
            });
            var idx = _records.indexOf(record);
            if (idx > -1) {
                _records.splice(idx, 1);
            }
            return record;
        };

        this.index = function (property, transformer) {
            var key = property || 'id';
            var index = _indexes[key];
            if (!index) {
                _indexes[key] = ArrayUtils.createIndex(_records, key, transformer);
            }
            return _indexes[key];
        };

        this.toArray = function () {
            return [].concat(_records);
        };

        if (angular.isArray(records)) {
            this.save(records);
        }
    };

    exports.Restsource = {
        ArrayUtils: ArrayUtils,
        ArrayCache: ArrayCache
    };

}(window));

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
                var applied = fn.apply(result, args);
                if (angular.isArray(applied) || angular.isObject(applied)) {
                    return PromiseExtensions.all(applied);
                }
                return applied;
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
