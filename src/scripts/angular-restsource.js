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
