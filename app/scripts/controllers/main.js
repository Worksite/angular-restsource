/* global alert */
'use strict';

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
            $scope.users = userRestsource.list(page, perPage).resolveTo([]);
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
