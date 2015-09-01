/**! 
 * angular-restsource v0.3.0
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
                        if (_useBodyResponseInterceptor) {
                            _options.responseInterceptors.unshift('bodyResponseInterceptor');
                        }
                        var interceptors = [];
                        angular.forEach(_options.responseInterceptors, function (interceptor) {
                            interceptors.push(angular.isString(interceptor) ? $injector.get(interceptor) : $injector.invoke(interceptor));
                        });
                        _options.responseInterceptors = interceptors;
                        if (angular.isString(_options.pathParams) || angular.isFunction(_options.pathParams) || angular.isArray(_options.pathParams)) {
                            _options.pathParams = angular.isString(_options.pathParams) ? $injector.get(_options.pathParams) : $injector.invoke(_options.pathParams);
                        }
                        return restsource(url, _options);
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

(function () {
    'use strict';

    function isSet(obj) {
        return obj !== undefined && obj !== null;
    }

    function isBoolean(obj) {
        return typeof obj === 'boolean';
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

        angular.extend(this, promise);

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

        this.map = function (transformer) {
            return _self.then(function (records) {
                return records.map(transformer);
            });
        };

        this.filter = function (predicate) {
            return _self.then(function (records) {
                return records.filter(predicate);
            });
        };

        this.reduce = function (iterator, initialValue) {
            return _self.then(function (records) {
                return records.reduce(iterator, initialValue);
            });
        };

        this.sort = function (comparator) {
            return _self.then(function (records) {
                records.sort(comparator);
                return records;
            });
        };

        this.index = function (property, transformer) {
            return _self.reduce(function (index, record) {
                var key = angular.isFunction(property) ? property(record) : record[property];
                index[key] = angular.isFunction(transformer) ? transformer(record) : record;
                return index;
            }, {});
        };

        this.indexOf = function (record) {
            return _self.then(function (records) {
                return records.indexOf(record);
            });
        };

        this.resolveTo = function (obj, mergeFn, resolveToFn) {
            if (angular.isFunction(resolveToFn)) {
                return resolveToFn(_self, obj, mergeFn);
            }

            return angular.isArray(obj) ?
                PromiseExtensions.resolveToArray(_self, obj, mergeFn) :
                PromiseExtensions.resolveTo(_self, obj, mergeFn);
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
     * @param [mergeFn] Function
     */
    PromiseExtensions.resolveTo = function (promise, obj, mergeFn) {
        if (angular.isString(obj) || angular.isNumber(obj) || isBoolean(obj)) {
            throw 'Invalid argument: cannot resolve to primitive';
        }

        var _primitive;
        var _rejection;
        var _resolved = false;
        var _super = {
            valueOf: obj.valueOf,
            toString: obj.toString,
            then: promise.then,
            catch: promise.catch,
            finally: promise.finally
        };
        var _mergeFn = angular.isFunction(mergeFn) ? mergeFn : PromiseExtensions.merge;

        var _promise = promise.then(function (resolved) {
            _resolved = true;
            if (angular.isString(resolved) || angular.isNumber(resolved) || isBoolean(resolved)) {
                _primitive = resolved;
            }
            return _mergeFn(obj, resolved);
        });

        promise.catch(function (rejection) {
            _rejection = rejection;
            _resolved = true;
        });

        Object.defineProperty(obj, '$promise', {
            get: function () {
                return _promise;
            }
        });

        Object.defineProperty(obj, '$primitive', {
            get: function () {
                return _primitive;
            }
        });

        Object.defineProperty(obj, '$rejection', {
            get: function () {
                return _rejection;
            }
        });

        Object.defineProperty(obj, '$isResolved', {
            get: function () {
                return _resolved;
            }
        });


        /**
         * Override `valueOf` to support resolving primitives
         * @returns {*}
         */
        obj.valueOf = function () {
            return isSet(_primitive) ? _primitive : _super.valueOf.call(obj);
        };

        /**
         * Override `toString` to support resolving primitives
         * @returns string
         */
        obj.toString = function () {
            return isSet(_primitive) ? _primitive.toString() : _super.toString.call(obj);
        };

        obj.$then = function () {
            return _super.then.apply(_promise, arguments);
        };

        obj.$catch = function () {
            return _super.catch.apply(_promise, arguments);
        };

        obj.$finally = function () {
            return _super.finally.apply(_promise, arguments);
        };


        /**
         * Provide promise-like aliases
         */
        obj.then = obj.$then;
        obj.catch = obj.$catch;
        obj.finally = obj.$finally;

        /**
         * Returns a promise to get the named property of an object.
         * @param key
         */
        obj.$get = function (key) {
            return obj.$then(function (results) {
                return results[key];
            });
        };

        return obj;
    };

    PromiseExtensions.merge = function (obj, resolved) {
        if (angular.isArray(resolved) && angular.isArray(obj)) {
            resolved.forEach(function (item) {
                obj.push(item);
            });
            return obj;
        }
        if (angular.isObject(resolved) && angular.isObject(obj)) {
            angular.extend(obj, resolved);
            return obj;
        }
        return resolved;
    };

    PromiseExtensions.resolveToArray = function (promise, arr, mergeFn) {

        PromiseExtensions.resolveTo(promise, arr, mergeFn);

        Object.defineProperty(arr, '$length', {
            get: function () {
                return arr.$then(function (records) {
                    return records.length;
                });
            }
        });

        arr.$spread = function (callback, errback) {
            return arr.$then(function (records) {
                return callback.apply(this, records);
            }, errback);
        };

        arr.$map = function (transformer) {
            return arr
                .$then(function (records) {
                    return records.map(transformer);
                });
        };

        arr.$filter = function (predicate) {
            return arr.$then(function (records) {
                return records.filter(predicate);
            });
        };

        arr.$reduce = function (iterator, initialValue) {
            return arr.$then(function (records) {
                return records.reduce(iterator, initialValue);
            });
        };

        arr.$forEach = function (iterator) {
            return arr.$then(function (records) {
                records.forEach(iterator);
            });
        };

        arr.$sort = function (comparator) {
            return arr.$then(function (records) {
                records.sort(comparator);
            });
        };

        arr.$indexOf = function (record) {
            return arr.$then(function (records) {
                return records.indexOf(record);
            });
        };

        /**
         * Construct an `index` from the resolved value of a promise
         * using a particular property.
         *
         * Optionally transform the record before adding it to
         * the index.
         *
         * @param property
         * @param transformer
         * @returns {Promise}
         */
        arr.$index = function (property, transformer) {
            return arr.$reduce(function (index, record) {
                var key = angular.isFunction(property) ? property(record) : record[property];
                index[key] = angular.isFunction(transformer) ? transformer(record) : record;
                return index;
            }, {});
        };

        return arr;
    };


    PromiseExtensions.resolveToStore = function (promise, arr, mergeFn) {

        PromiseExtensions.resolveToArray(promise, arr, mergeFn);

        var _super = {
            $index: arr.$index
        };

        var _indexes = {
            id: _super.$index('id')
        };


        function updateIndexes(record) {
            return arr.$indexes().then(function (indexes) {
                var exists = false;
                angular.forEach(indexes, function (index, property) {
                    var key = record[property];
                    var value = index[key];
                    if (!value) {
                        index[key] = record;
                    } else {
                        exists = true;
                    }
                });
                return exists;
            });
        }

        /**
         * Gets or creates an index of models based on the passed property and transformer.
         * @param {String} [property='id'] Model property used to create the index
         * @param {Function} [transformer] Model transformer function used to create the index
         * @returns {Promise} a promise for the index
         */
        arr.$index = function (property, transformer) {
            var key = property || 'id';
            var index = _indexes[key];
            if (!index) {
                _indexes[key] = _super.$index(key, transformer);
            }
            return _indexes[key];
        };

        /**
         * @returns {Promise} a promise for all indexes
         */
        arr.$indexes = function () {
            return PromiseExtensions.all(_indexes);
        };

        /**
         * Returns a record from the promise by the record id
         * @param {Number} id Model ID
         * @returns {Promise} a promise for the record
         */
        arr.$read = function (id) {
            return _indexes.id.then(function (map) {
                return map[id];
            });
        };

        /**
         * Updates the record instance
         * @param {Object} record
         * @returns {Promise} a promise for the record
         */
        arr.$update = function (record) {
            return _indexes.id.then(function (index) {
                var updated = index[record.id];
                if (!updated) {
                    return PromiseExtensions.reject('record not found');
                }
                angular.extend(updated, record);
                return updated;
            });
        };

        arr.$save = function (record) {
            return _indexes.id.then(function (index) {
                return index[record.id] ?
                    arr.$update(record) :
                    arr.$push(record);
            });
        };

        arr.$saveAll = function (records) {
            return PromiseExtensions.all(records.map(arr.$save));
        };

        /**
         * Adds a record to the end of the list
         * @param {Object} record
         * @returns {Promise} a promise for the record
         */
        arr.$push = function (record) {
            return updateIndexes(record).then(function () {
                arr.push(record);
                return record;
            });
        };

        arr.$pushAll = function (records) {
            return PromiseExtensions.all(records.map(arr.$push));
        };


        /**
         * Adds a record to the beginning of the list
         * @param {Object} record
         * @returns {Promise} a promise for the record
         */
        arr.$unshift = function (record) {
            return updateIndexes(record).then(function () {
                arr.unshift(record);
                return record;
            });
        };


        arr.$insert = function (position, record) {
            return updateIndexes(record).then(function () {
                arr.insert(position, record);
                return record;
            });
        };


        /**
         * Removes the model from the list of records and all indexes
         * @param {Number} recordOrId Model ID
         * @returns {Promise} a promise for the model
         */
        arr.$remove = function (recordOrId) {
            return arr.$indexes().then(function (indexes) {
                var record = indexes.id[recordOrId] || indexes.id[recordOrId.id];
                if (!record) {
                    return undefined;
                }
                angular.forEach(indexes, function (index, property) {
                    var key = record[property];
                    delete index[key];
                });
                var idx = arr.indexOf(record);
                if (idx > -1) {
                    arr.splice(idx, 1);
                }
                return record;
            });
        };

        arr.$removeAll = function (records) {
            return PromiseExtensions.all(records.map(arr.$remove));
        };

        arr.$clear = function () {
            return arr.$indexes().then(function (indexes) {
                angular.forEach(indexes, function (index) {
                    Object.keys(index).forEach(function (key) {
                        delete index[key];
                    });
                });
                arr.length = 0;
                return arr;
            });
        };

        return arr;
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
