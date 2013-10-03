'use strict';

angular.module('angular-restsource-demo-app', ['ngRoute', 'angular-restsource'])
    .config(['restsourceProvider', function (restsourceProvider) {

        restsourceProvider

            // Add $http config's to be used with each call

            // Enable CORS support
            .httpConfig({withCredentials: true})

            // Set default values for `page` and `perPage` query params.  Defaults are 1 and 25.
            .defaultListLimits(1, 25)

            // Use the bodyResponseInterceptor to return `response.data.body` and `response.data.error`
            // for success and error responses respectively.  ENABLED BY DEFAULT.
            .useBodyResponseInterceptor(true)

            // Like `$httpProvider.responseInterceptors`, `addResponseInterceptor` takes either
            // a function or a service string

            // Add a response interceptor to log requests
            .addResponseInterceptor(['$log', function ($log) {
                return function (promise) {
                    var start = new Date();
                    promise.success(function (body, status, headers, config) {
                        $log.log([config.method, config.url, status, (new Date() - start) + 'msec'].join(' '));
                        $log.log('  params: ' + JSON.stringify(config.params));
                        if (config.data) {
                            $log.log('  data: ' + JSON.stringify(config.data));
                        }
                    });
                    return promise;
                };
            }]);

        // Create a userRestsource that pulls data from http://localhost:9999/api/user
        restsourceProvider.provide('userRestsource', 'http://localhost:9999/api/user')

            // Set default values for `page` and `perPage` query params.  Defaults are 1 and 25.
            .defaultListLimits(1, 10)

            // Add a custom verb to read the user's name from GET http://localhost:9999/api/user/:id/name
            // The function transforms the method signature into a `$http` config per http://docs.angularjs.org/api/ng.$http
            .verb('readName', function (id, cfg) {
                return angular.extend(cfg || {}, {
                    method: 'GET',
                    url: '/' + id + '/name'
                });
            });

    }])
    .config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });

        // Allow CORS requests
        $httpProvider.defaults.useXDomain = true;
    }]);
