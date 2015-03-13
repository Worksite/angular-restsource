/**! 
 * angular-restsource v0.2.6
 * Copyright (c) 2013 Ares Project Management LLC <code@prismondemand.com>
 */
(function () {
    'use strict';

    /**
     * @param $http
     * @param $q
     * @param $parse
     * @param $log
     * @param {String} rootUrl
     * @param {Object} [options]
     * @constructor
     */
    var Restsource = function ($http, $q, $parse, $log, rootUrl, options) {
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
            return _opts.responseInterceptors.reduce(function (httpPromise, responseInterceptor) {
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
                return _interceptResponse($http(_interceptRequest(config)));
            };
        });

        this.save = function (record, cfg) {
            return record[_opts.idField] ? _self.update(record, _defaultCfg(cfg)) : _self.create(record, _defaultCfg(cfg));
        };

        this.clone = function (opts) {
            return new Restsource($http, $q, $parse, $log, rootUrl, angular.extend({}, _opts, opts));
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

                    this.verb = function (name) {
                        var args = Array.prototype.slice.call(arguments);
                        var argumentTransformer;
                        var url;

                        if (args.length === 3) {
                            url = args[1];
                            argumentTransformer = args[2];
                        } else if (args.length === 2) {
                            if (angular.isString(args[1])) {
                                url = args[1];
                                argumentTransformer = _options.verbs[name];
                            } else if (angular.isFunction(args[1])) {
                                argumentTransformer = args[1];
                            }
                        }
                        _options.verbs[name] = !url ? argumentTransformer : function () {
                            var config = argumentTransformer.apply({}, arguments);
                            config.url = url;
                            return config;
                        };
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

            this.$get = function ($http, $q, $parse, $log) {
                return function (url, cfg) {
                    return new Restsource($http, $q, $parse, $log, url, cfg);
                };
            };
            this.$get.$inject = ['$http', '$q', '$parse', '$log'];

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
