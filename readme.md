# angular-restsource

> Restful resources for AngularJS

[![Build Status](https://travis-ci.org/AresProjectManagement/angular-restsource.png?branch=master)](https://travis-ci.org/AresProjectManagement/angular-restsource)

## Installation

Download [angular-restsource.js](https://github.com/AresProjectManagement/angular-restsource/blob/master/dist/scripts/angular-restsource.js) or install with bower.

```bash
$ bower install angular-restsource --save
```

Load the `angular-restsource` modules into your app and configure...

```javascript
angular.module('app', ['angular-restsource']);
```

## Usage

Register a Restsource service

```javascript
    angular.module('angular-restsource-demo-app').factory('userRestsource', ['Restsource', 'env', function (Restsource, env) {
        return Restsource.create(env.apiUrl + '/user');
    }]);
```

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