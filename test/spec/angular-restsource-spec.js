/**
 * RTFM:
 *   - http://docs.angularjs.org/guide/dev_guide.unit-testing
 *   - http://docs.angularjs.org/api/angular.mock.inject
 */

describe('Service: Restsource', function () {
    'use strict';

    // load the service's module
    beforeEach(module('angular-restsource'));

    beforeEach(module(function (restsourceProvider) {
        restsourceProvider.provide('userRestsource', '/api/user')
            .verb('readName', function (id, cfg) {
                return angular.extend(cfg || {}, {
                    method: 'GET',
                    url: '/' + id + '/name'
                });
            });
    }));

    // instantiate service
    var restsource,
        $httpBackend;

    beforeEach(inject(function (_restsource_, $injector) {
        $httpBackend = $injector.get('$httpBackend');
        restsource = _restsource_;
    }));

    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('restsource', function () {

        it('should create a Restsource instance with the root url', function () {
            var fooResource = restsource('/api/foo');
            expect(fooResource.rootUrl).toBe('/api/foo');
        });
    });

    describe('Restsource instance', function () {

        var userResource,
            theUser = {id: '123', name: 'Yo Momma'},
            theResponseBody = {foo: 'bar'},
            theResponse = {success: true, body: theResponseBody};


        beforeEach(inject(function (_userRestsource_) {
            userResource = _userRestsource_;
        }));

        it('should send a request to create a user', function () {
            $httpBackend.expectPOST('/api/user', theUser).respond(theResponse);

            var promise = userResource.create(theUser);
            promise.success(function (body) {
                expect(body).toBe(theResponseBody);
            });

            $httpBackend.flush();
        });

        it('should send a request to read a user', function () {

            $httpBackend.expectGET('/api/user/123abc').respond(theResponse);

            userResource.read('123abc').success(function (body) {
                expect(body).toBe(theResponseBody);
            });

            $httpBackend.flush();
        });

        it('should send a request to list users with default page and perPage params', function () {

            $httpBackend.expectGET('/api/user?page=1&perPage=25').respond(theResponse);

            userResource.list().success(function (body) {
                expect(body).toBe(theResponseBody);
            });

            $httpBackend.flush();

        });

        it('should send a request to list users with page and perPage params', function () {

            $httpBackend.expectGET('/api/user?page=2&perPage=5').respond(theResponse);

            userResource.list(2, 5).success(function (body) {
                expect(body).toBe(theResponseBody);
            });

            $httpBackend.flush();

        });

        it('should send a request to update a user', function () {
            $httpBackend.expectPUT('/api/user/123', theUser).respond(theResponse);

            userResource.update(theUser).success(function (body) {
                expect(body).toBe(theResponseBody);
            });

            $httpBackend.flush();
        });

        it('should send a request to delete a user', function () {
            $httpBackend.expectDELETE('/api/user/123abc').respond(theResponse);

            userResource.delete('123abc').success(function (body) {
                expect(body).toBe(theResponseBody);
            });

            $httpBackend.flush();
        });

        describe('Restsource instance with a custom readName verb', function () {

            it('should send a request to read a user\'s name', function () {

                $httpBackend.expectGET('/api/user/123abc/name').respond(theResponse);

                userResource.readName('123abc').success(function (body) {
                    expect(body).toBe(theResponseBody);
                });

                $httpBackend.flush();
            });
        });

        describe('Restsource:save', function () {

            var existingUser = {id: '123', name: 'Yo Momma'},
                newUser = {name: 'Yo Momma'};

            it('should send a request to create the user when the user has no ID', function () {
                $httpBackend.expectPOST('/api/user', newUser).respond(theResponse);

                userResource.save(newUser).success(function (body) {
                    expect(body).toBe(theResponseBody);
                });

                $httpBackend.flush();
            });

            it('should send a request to update the user when the user has an ID', function () {
                $httpBackend.expectPUT('/api/user/123', existingUser).respond(theResponse);

                userResource.save(existingUser).success(function (body) {
                    expect(body).toBe(theResponseBody);
                });

                $httpBackend.flush();
            });

        });

        describe('promise.success', function () {

            it('should be called with response.data.body, response.status, response.headers, response.config', function () {
                $httpBackend.expectPUT('/api/user/123', theUser).respond(theResponse);

                userResource.update(theUser).success(function (body, status, headers, config) {
                    expect(body).toBe(theResponseBody);
                    expect(status).toBe(200);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

            it('should be called with undefined if response has no body', function () {
                $httpBackend.expectPUT('/api/user/123', theUser).respond({});

                userResource.update(theUser).success(function (body, status, headers, config) {
                    expect(body).toBeUndefined();
                    expect(status).toBe(200);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

            it('should be called with undefined if response is empty', function () {
                $httpBackend.expectPUT('/api/user/123', theUser).respond();

                userResource.update(theUser).success(function (body, status, headers, config) {
                    expect(body).toBeUndefined();
                    expect(status).toBe(200);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

            it('should not reject response body of false', function () {
                $httpBackend.expectPUT('/api/user/123', theUser).respond({body: false});

                userResource.update(theUser).success(function (body, status, headers, config) {
                    expect(body).toBe(false);
                    expect(status).toBe(200);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

        });

        describe('promise.error', function () {

            it('should be called with response.data.error, response.status, response.headers, response.config', function () {
                var apiError = {
                    message: 'foo'
                };

                $httpBackend.expectPUT('/api/user/123', theUser).respond(500, {
                    error: apiError
                });

                userResource.update(theUser).error(function (error, status, headers, config) {
                    expect(error).toBe(apiError);
                    expect(status).toBe(500);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

            it('should be called with empty error object if response body has no error object', function () {
                var apiError = {
                    message: 'foo'
                };

                $httpBackend.expectPUT('/api/user/123', theUser).respond(500, {});

                userResource.update(theUser).error(function (error, status, headers, config) {
                    expect(error).toBeDefined({});
                    expect(status).toBe(500);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

            it('should be called with empty error object if response is empty', function () {
                var apiError = {
                    message: 'foo'
                };

                $httpBackend.expectPUT('/api/user/123', theUser).respond(500);

                userResource.update(theUser).error(function (error, status, headers, config) {
                    expect(error).toBeDefined({});
                    expect(status).toBe(500);
                    expect(headers).toBeDefined();
                    expect(config).toBeDefined();
                });

                $httpBackend.flush();
            });

        });

    });

});
