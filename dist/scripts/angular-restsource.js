/**! 
 * angular-restsource v0.2.5
 * Copyright (c) 2013 Ares Project Management LLC <code@prismondemand.com>
 */
(function () {
    'use strict';

    /**
     * @param $http
     * @param $q
     * @param $parse
     * @param {String} rootUrl
     * @param {Object} [options]
     * @constructor
     */
    var Restsource = function ($http, $q, $parse, rootUrl, options) {
        var _opts = angular.extend({
            idField: 'id',
            responseInterceptors: [],
            httpConfig: {},
            verbs: {},
            pathParams: {}
        }, options);

        var _self = this;

        function _defaultCfg(cfg) {
            return angular.extend(_opts.httpConfig, cfg);
        }

        function _intercept(httpPromise) {
            angular.forEach(_opts.responseInterceptors, function (responseInterceptor) {
                httpPromise = responseInterceptor(httpPromise);
            });
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
            return matches.reduce(function (url, match) {
                var field = match.replace(/[\{\}]+/g, '');
                var value = $parse(field)(angular.extend({}, _opts.pathParams, pathParams || {}));
                return url.replace(match, value);
            }, url);
        }

        // Create verb methods
        angular.forEach(_opts.verbs, function (verb, name) {
            _self[name] = function () {
                var config = _defaultCfg(verb.apply(_self, arguments));
                config.url = interpolateUrl(rootUrl + config.url, config.pathParams);
                return _intercept($http(config));
            };
        });

        this.save = function (record, cfg) {
            return record[_opts.idField] ? _self.update(record, _defaultCfg(cfg)) : _self.create(record, _defaultCfg(cfg));
        };

        this.clone = function (opts) {
            return new Restsource($http, $q, $parse, rootUrl, angular.extend(_opts, opts));
        };
    };

    angular.module('angular-restsource', []).config(['$provide', function ($provide) {

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

                    this.verb = function (name, argumentTransformer) {
                        _options.verbs[name] = argumentTransformer;
                        return _self;
                    };

                    this.verb('create', function (record, cfg) {
                        return angular.extend(cfg ? angular.copy(cfg) : {}, {
                            method: 'POST',
                            url: '',
                            data: record
                        });
                    });

                    this.verb('read', function (id, cfg) {
                        return angular.extend(cfg ? angular.copy(cfg) : {}, {
                            method: 'GET',
                            url: '/{{id}}',
                            pathParams: {
                                id: id
                            }
                        });
                    });

                    this.verb('update', function (record, cfg) {
                        return angular.extend(cfg ? angular.copy(cfg) : {}, {
                            method: 'PUT',
                            url: '/{{id}}',
                            pathParams: {
                                id: record[_options.idField]
                            },
                            data: record
                        });
                    });

                    this.verb('list', function (page, perPage, cfg) {
                        return angular.extend(cfg ? angular.copy(cfg) : {}, {
                            method: 'GET',
                            url: '',
                            params: {
                                page: page || _defaultListLimits.page,
                                perPage: perPage || _defaultListLimits.perPage
                            }
                        });
                    });

                    this.verb('delete', function (id, cfg) {
                        return angular.extend(cfg ? angular.copy(cfg) : {}, {
                            method: 'DELETE',
                            url: '/{{id}}',
                            pathParams: {
                                id: id
                            }
                        });
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

            this.$get = function ($http, $q, $parse) {
                return function (url, cfg) {
                    return new Restsource($http, $q, $parse, url, cfg);
                };
            };
            this.$get.$inject = ['$http', '$q', '$parse'];

        });

        $provide.factory('bodyResponseInterceptor', ['$q', function ($q) {
            return function (httpPromise) {
                var promise = httpPromise.then(function (response) {
                    var data = response.data || {};
                    if (data.error || data.body === undefined) {
                        return $q.reject(response);
                    }
                    return data.body;
                });

                // Retain the $httpPromise API

                promise.success = function (fn) {
                    httpPromise.then(function (response) {
                        var data = response.data || {};
                        fn(data.body, response.status, response.headers, response.config);
                    });
                    return promise;
                };
                promise.error = function (fn) {
                    httpPromise.then(null, function (response) {
                        var data = response.data || {};
                        fn(data.error || {}, response.status, response.headers, response.config);
                    });
                    return promise;
                };

                return promise;
            };
        }]);

    }]);

})();
