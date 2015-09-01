describe('Service: PromiseExtensions', function () {
    'use strict';

    // load the service's module
    beforeEach(module('angular-restsource.promise-extensions'));


    describe('PromiseExtensions instance', function () {

        it('should have the right interface', inject(function (PromiseExtensions) {

            var promise = PromiseExtensions.when(123);
            expect(promise.then).toBeDefined();
            expect(promise.catch).toBeDefined();
            expect(promise.finally).toBeDefined();
            expect(promise.spread).toBeDefined();
            expect(promise.map).toBeDefined();
            expect(promise.index).toBeDefined();
            expect(promise.resolveTo).toBeDefined();
        }));

        describe('then', function () {

            it('should handle resolved promises', inject(function (PromiseExtensions, $rootScope) {
                var actual = {
                    res1: 'untouched',
                    res2: 'untouched',
                    err1: 'untouched',
                    err2: 'untouched'
                };

                var promise = PromiseExtensions.when(123);

                promise.then(function (res) {
                    actual.res1 = res;
                }, function (e) {
                    actual.err1 = e;
                });

                promise.then(function (res) {
                    actual.res2 = res;
                }, function (e) {
                    actual.err2 = e;
                });

                $rootScope.$digest();

                expect(actual.res1).toBe(123);
                expect(actual.res2).toBe(123);
                expect(actual.err1).toBe('untouched');
                expect(actual.err2).toBe('untouched');

            }));
        });

        it('should handle rejected promises', inject(function (PromiseExtensions, $rootScope) {
            var actual = {
                res1: 'untouched',
                res2: 'untouched',
                err1: 'untouched',
                err2: 'untouched'
            };

            var promise = PromiseExtensions.reject(123);

            promise.then(function (res) {
                actual.res1 = res;
            }, function (e) {
                actual.err1 = e;
            });

            promise.then(function (res) {
                actual.res2 = res;
            }, function (e) {
                actual.err2 = e;
            });

            $rootScope.$digest();

            expect(actual.res1).toBe('untouched');
            expect(actual.res2).toBe('untouched');
            expect(actual.err1).toBe(123);
            expect(actual.err2).toBe(123);

        }));

        it('should be chainable', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when(1);

            var callback = jasmine.createSpy('callback');


            var p = promise
                .then(function (res) {
                    return res + 1;
                })
                .then(function (res) {
                    return res + 2;
                })
                .then(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith(4);

        }));


    });

    describe('catch', function () {
        it('should handle rejected promises', inject(function (PromiseExtensions, $rootScope) {
            var actual = {
                err1: 'untouched',
                err2: 'untouched'
            };

            var promise = PromiseExtensions.reject(123);

            promise.catch(function (e) {
                actual.err1 = e;
            });

            promise.catch(function (e) {
                actual.err2 = e;
            });

            $rootScope.$digest();

            expect(actual.err1).toBe(123);
            expect(actual.err2).toBe(123);

        }));

        it('should be chainable', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.reject(1);

            var callback = jasmine.createSpy('callback');

            var p = promise
                .catch(function (res) {
                    return PromiseExtensions.reject(res + 1);
                })
                .catch(function (res) {
                    return PromiseExtensions.reject(res + 2);
                })
                .catch(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith(4);

        }));
    });

    describe('finally', function () {

        it('should handle resolved promises', inject(function (PromiseExtensions, $rootScope) {
            var actual = {
                err1: 'untouched',
                err2: 'untouched'
            };

            var promise = PromiseExtensions.when(123);

            var fin1 = jasmine.createSpyObj('fin1', ['callback', 'notify']);
            var fin2 = jasmine.createSpyObj('fin2', ['callback', 'notify']);

            promise.finally(fin1.callback, fin1.notify);
            promise.finally(fin2.callback, fin2.notify);

            $rootScope.$digest();

            expect(fin1.callback).toHaveBeenCalledWith();
            expect(fin1.notify).not.toHaveBeenCalledWith();
            expect(fin2.callback).toHaveBeenCalledWith();
            expect(fin2.notify).not.toHaveBeenCalledWith();

        }));

        it('should handle rejected promises', inject(function (PromiseExtensions, $rootScope) {
            var actual = {
                err1: 'untouched',
                err2: 'untouched'
            };

            var promise = PromiseExtensions.reject(123);

            var fin1 = jasmine.createSpyObj('fin1', ['callback', 'notify']);
            var fin2 = jasmine.createSpyObj('fin2', ['callback', 'notify']);

            promise.finally(fin1.callback, fin1.notify);
            promise.finally(fin2.callback, fin2.notify);

            $rootScope.$digest();

            expect(fin1.callback).toHaveBeenCalledWith();
            expect(fin1.notify).not.toHaveBeenCalledWith();
            expect(fin2.callback).toHaveBeenCalledWith();
            expect(fin2.notify).not.toHaveBeenCalledWith();

        }));

        it('should be chainable', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when(11);

            var callback = jasmine.createSpy('callback');

            var p = promise
                .finally(function () {
                    return 1;
                })
                .finally(function () {
                    return 2;
                })
                .then(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith(11);

        }));

    });


    describe('spread', function () {

        it('should spread a resolved array to callback arguments', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when([1, 2, 3]);

            var callback = jasmine.createSpy('callback');

            promise.spread(callback);

            $rootScope.$digest();

            expect(callback).toHaveBeenCalledWith(1, 2, 3);

        }));

        it('should be chainable', inject(function (PromiseExtensions, $rootScope) {
            var promise = PromiseExtensions.when([1, 2, 3]);

            var callback = jasmine.createSpy('callback');

            var p = promise
                .spread(function (a, b, c) {
                    return [c, a, b];
                })
                .spread(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith(3, 1, 2);

        }));

    });

    describe('map', function () {

        it('should transform a resolved array', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when([1, 2, 3]);

            var callback = jasmine.createSpy('callback');

            var p = promise
                .map(function (i) {
                    return i + 10;
                })
                .map(function (i) {
                    return '$' + i;
                })
                .spread(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith('$11', '$12', '$13');
        }));

    });

    describe('index', function () {

        it('should create an index from the resolved array of records', inject(function (PromiseExtensions, $rootScope) {

            var actual = {};

            var promise = PromiseExtensions.when([
                {id: 11, name: 'a'},
                {id: 12, name: 'b'},
                {id: 13, name: 'c'}
            ]);

            var p = promise.index('id').then(function (index) {
                actual.index = index;
            });

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(actual.index[11].name).toBe('a');
            expect(actual.index[12].name).toBe('b');
            expect(actual.index[13].name).toBe('c');

        }));

    });

    describe('resolveTo', function () {

        it('should resolve arrays to the passed array instance', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when([1, 2, 3]);

            var records = promise.resolveTo([]);

            expect(records.length).toBe(0);

            expect(records.toString()).toBe('');
            expect(records.valueOf() instanceof Object).toBe(true);
            expect(records.$primitive).toBeUndefined();

            $rootScope.$digest();

            expect(records.length).toBe(3);
            expect(records[0]).toBe(1);
            expect(records[1]).toBe(2);
            expect(records[2]).toBe(3);

            expect(records.toString()).toBe('1,2,3');
            expect(records.valueOf() instanceof Object).toBe(true);
            expect(records.$primitive).toBeUndefined();

        }));

        it('should resolve objects to the passed object instance', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when({id: 11, name: 'a'});

            var record = promise.resolveTo({});

            expect(record.id).toBeUndefined();
            expect(record.name).toBeUndefined();

            expect(record.toString()).toBe('[object Object]');
            expect(record.valueOf() instanceof Object).toBe(true);
            expect(record.$primitive).toBeUndefined();

            $rootScope.$digest();

            expect(record.id).toBe(11);
            expect(record.name).toBe('a');

            expect(record.toString()).toBe('[object Object]');
            expect(record.valueOf() instanceof Object).toBe(true);
            expect(record.$primitive).toBeUndefined();
        }));

        it('should resolve a string to the passed object instance', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when('foo');

            var record = promise.resolveTo({});

            expect(record.toString()).toBe('[object Object]');
            expect(record.valueOf() instanceof Object).toBe(true);
            expect(record.$primitive).toBeUndefined();

            $rootScope.$digest();

            expect(record.toString()).toBe('foo');
            expect(record.valueOf()).toBe('foo');
            expect(record.$primitive).toBe('foo');

        }));

        it('should resolve a number to the passed object instance', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when(123);

            var record = promise.resolveTo({});

            expect(record.toString()).toBe('[object Object]');
            expect(record.valueOf() instanceof Object).toBe(true);
            expect(record.$primitive).toBeUndefined();

            $rootScope.$digest();

            expect(record.toString()).toBe('123');
            expect(record.valueOf()).toBe(123);
            expect(record.$primitive).toBe(123);

        }));

        it('should resolve a boolean to the passed object instance', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when(true);

            var record = promise.resolveTo({});

            expect(record.toString()).toBe('[object Object]');
            expect(record.valueOf() instanceof Object).toBe(true);

            $rootScope.$digest();

            expect(record.toString()).toBe('true');
            expect(record.valueOf()).toBe(true);

        }));

        it('should extend the passed object instance to be promise-like', inject(function (PromiseExtensions, $rootScope) {

            var actual = {};

            var promise = PromiseExtensions.when([1, 2, 3]);

            var records = promise.resolveTo([]);

            records.then(function (res) {
                actual.res = res;
            });

            expect(records.$isResolved).toBe(false);

            $rootScope.$digest();

            expect(records.$isResolved).toBe(true);

            expect(actual.res.length).toBe(3);
            expect(actual.res[0]).toBe(1);
            expect(actual.res[1]).toBe(2);
            expect(actual.res[2]).toBe(3);
        }));

    });


});
