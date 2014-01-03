# angular-restsource

[![Build Status](https://travis-ci.org/AresProjectManagement/angular-restsource.png?branch=master)](https://travis-ci.org/AresProjectManagement/angular-restsource)
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/AresProjectManagement/angular-restsource/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

> Restful resources for AngularJS

`angular-restsource` allows you to easily define `RESTful` API clients with very little boilerplate.

By default `angular-restsource` maps CRUD verbs to a `RESTful` API as follows...

```
VERB        METHOD      URL
--------------------------------------
create      POST        /:root-url
read        GET         /:root-url/:id
list        GET         /:root-url
update      PUT         /:root-url/:id
delete      DELETE      /:root-url/:id
```

However, `angular-restsource` makes it easy to override any of these mappings and even create custom ones.

Finally, each `angular-restsource` verb returns a `$http` promise.

## Install

Download [angular-restsource.js](https://github.com/AresProjectManagement/angular-restsource/blob/master/dist/scripts/angular-restsource.js) or install with bower.

```bash
$ bower install angular-restsource --save
```

Load the `angular-restsource` module into your app...

```javascript
angular.module('app', ['angular-restsource'])
```

## Configure

The `restsourceProvider` allows you to...
* define `restsource`'s for API endpoints
* specify default configs to use with each `$http` call by each restsource
* add custom verb methods
* add response interceptors
* disable the `bodyResponseInterceptor` enabled by default 

Example:

```javascript
    .config(['restsourceProvider', function (restsourceProvider) {

        // Create a userRestsource that pulls data from http://localhost:9999/api/user
        restsourceProvider.provide('userRestsource', 'http://localhost:9999/api/user')

            // Add $http config's to be used with each call

            // Enable CORS support
            .httpConfig({withCredentials: true})

            // Set default values for `page` and `perPage` query params.  Defaults are 1 and 25.
            .defaultListLimits(1, 10)

            // Add a custom verb to read the user's name from GET http://localhost:9999/api/user/:id/name
            // The function transforms the method signature into a `$http` config per http://docs.angularjs.org/api/ng.$http
            .verb('readName', function (id, cfg) {
                return angular.extend(cfg || {}, {
                    method: 'GET',
                    url: '/' + id + '/name'
                });
            })

            // Use the bodyResponseInterceptor to return `response.data.body` and `response.data.error`
            // for success and error responses respectively.  ENABLED BY DEFAULT.
            .useBodyResponseInterceptor(true)

            // Like `$httpProvider.responseInterceptors`, `addResponseInterceptor` takes either
            // a function or a service string

            // Add a response interceptor to log requests
            .addResponseInterceptor(['$log', function ($log) {
                return function (promise) {
                    promise.success(function (body, status, headers, config) {
                        $log.log([config.method, config.url, status].join(' '));
                        $log.log('  params: ' + JSON.stringify(config.params));
                        if (config.data) {
                            $log.log('  data: ' + JSON.stringify(config.data));
                        }
                    });
                    return promise;
                };
            }]);
    }]);
```

Alternatively, you can register a Restsource via `Module.factory`...

```javascript
    angular.module('angular-restsource-demo-app').factory('userRestsource', ['restsource', 'env', function (restsource, env) {
        return restsource(env.apiUrl + '/user');
    }]);
```

## Usage

Use the Restsource

```javascript
angular.module('angular-restsource-demo-app')
    .controller('MainCtrl', ['$scope', 'userRestsource', function ($scope, userRestsource) {

        $scope.page = 1;
        $scope.perPage = 5;

        $scope.create = function (user) {
            userRestsource.create(user).success(function () {
                $scope.list($scope.page, $scope.perPage);
            });
        };

        $scope.read = function (id) {
            userRestsource.read(id).success(function (user) {
                $scope.selectedUser = user;
            });
        };

        $scope.readName = function (id) {
            userRestsource.readName(id).success(function (name) {
                alert(name);
            });
        };

        $scope.list = function (page, perPage) {
            $scope.users = userRestsource.list(page, perPage);
        };

        $scope.update = function (user) {
            userRestsource.update(user).success(function () {
                $scope.list($scope.page, $scope.perPage);
            });
        };

        $scope.delete = function (user) {
            userRestsource.delete(user.id).success(function () {
                $scope.selectedUser = null;
                $scope.list($scope.page, $scope.perPage);
            });
        };

        $scope.list($scope.page, $scope.perPage);

        $scope.$watch(function () {
            return $scope.page * $scope.perPage;
        }, function () {
            $scope.list($scope.page, $scope.perPage);
        });

    }]);
```

### API

See https://github.com/AresProjectManagement/angular-restsource/blob/master/test/spec/angular-restsource-spec.js

### Sample App

See https://github.com/AresProjectManagement/angular-restsource/tree/master/app.

## Contributing

### Prerequisites

The project requires [Bower](http://bower.io), [Grunt](http://gruntjs.com), and [PhantomJS](http://phantomjs.org).  Once you have installed them, you can build, test, and run the project.

### Build & Test

To build and run tests, run either...

```bash
$ make install
```

or

```bash
$ npm install
$ bower install
$ grunt build
```

### Demo & Develop

To run a live demo or do some hackery, run...

```bash
$ grunt server
```

## License

MIT
