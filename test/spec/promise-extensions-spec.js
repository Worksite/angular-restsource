describe('Service: PromiseExtensions', function () {
    'use strict';

    // load the service's module
    beforeEach(module('angular-restsource.promise-extensions'));

    describe('PromiseExtensions class methods', function () {

        describe('isResolvedTo', function () {

            it('should determine if an instance has been augmented by `resolveTo`', inject(function (PromiseExtensions) {

                var promise = PromiseExtensions.when(123);

                var resolveTo = promise.resolveTo({});

                expect(PromiseExtensions.isResolvedTo(resolveTo)).toBe(true);
                expect(PromiseExtensions.isResolvedTo({})).toBe(false);
                expect(PromiseExtensions.isResolvedTo([])).toBe(false);

            }));

        });

    });


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


            it('should handle nested promises', inject(function (PromiseExtensions, $rootScope) {

                var actual = {};

                PromiseExtensions.when(123)
                    .then(function (result) {
                        return PromiseExtensions.when(result + 10);
                    })
                    .then(function (result) {
                        actual.result = result;
                    });

                $rootScope.$digest();

                expect(actual.result).toBe(133);


            }))
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

    describe('invoke', function () {

        it('should invoke the method the resolved result', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when(['def', 'abc']);

            var callback = jasmine.createSpy('callback');

            var p = promise
                .invoke('sort')
                .spread(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith('abc', 'def');
        }));

        it('should return null for null resolved result', inject(function (PromiseExtensions, $rootScope) {

            var promise = PromiseExtensions.when(null);

            var callback = jasmine.createSpy('callback');

            var p = promise
                .invoke('sort')
                .then(callback);

            $rootScope.$digest();

            expect(p instanceof PromiseExtensions).toBe(true);
            expect(callback).toHaveBeenCalledWith(null);
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

        it('should resolve nested promises', inject(function (PromiseExtensions, $rootScope) {

            var actual = {};

            var promise = PromiseExtensions.when([1, 2, 3]);

            var p = promise
                .map(function (i) {
                    return PromiseExtensions.when(i + 10);
                })
                .then(function (values) {
                    actual.values = values;
                });

            $rootScope.$digest();


            expect(actual.values).toEqual([11, 12, 13]);

        }));

    });


    describe('flatMap', function () {

        it('should transform array', inject(function (PromiseExtensions, $rootScope) {

            var actual = {};

            var promise = PromiseExtensions.when(['abc', 'def']);

            promise
                .flatMap(function (word) {
                    return word.split('').map(PromiseExtensions.when);
                })
                .then(function (letters) {
                    actual.letters = letters;
                });


            $rootScope.$digest();

            expect(actual.letters).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);

        }));

    });

    describe('all', function () {

        it('should resolve a promise of promises', inject(function (PromiseExtensions, $rootScope) {
            var actual = {};

            var promise = PromiseExtensions.when([1, 2, 3]);

            promise
                .then(function (numbers) {
                    return numbers.map(PromiseExtensions.when);
                })
                .all()
                .then(function (numbers) {
                    actual.numbers = numbers;
                });

            $rootScope.$digest();


            expect(actual.numbers).toEqual([1, 2, 3]);
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

        var objectPromise;
        var arrayPromise;
        var stringPromise;
        var numberPromise;
        var booleanPromise;

        beforeEach(inject(function ($q) {

            function when(obj) {
                var promise = $q.when(obj);
                promise.$r = obj;
                return promise;
            }

            objectPromise = when({a: 1, b: 2, c: 3});
            arrayPromise = when(['a', 'b', 'c']);
            stringPromise = when('abc');
            numberPromise = when(123);
            booleanPromise = when(true);
        }));

        it('it should return a resolved object with a $promise attribute', inject(function (PromiseExtensions, $rootScope) {
            var obj = PromiseExtensions.resolveTo(objectPromise, {d: 4});

            expect(obj.$promise).toBeDefined();
            expect(obj.$promise.$isResolved).toBe(false);
            expect(obj.$promise.$resolved).toBeUndefined();

            $rootScope.$apply();

            expect(obj.$promise.$isResolved).toBe(true);
            expect(obj.$promise.$resolved).toBe(obj);
        }));

        it('it should throw an exception if the passed a primitive', inject(function (PromiseExtensions) {


            expect(function () {
                PromiseExtensions.resolveTo(objectPromise, '');
            }).toThrow('Invalid argument: resolved must be an object');

        }));

        it('it should merge an object to an object', inject(function (PromiseExtensions, $rootScope) {
            var obj = PromiseExtensions.resolveTo(objectPromise, {d: 4});

            expect(Object.keys(obj).sort().join(',')).toBe('d');
            expect(obj.d).toBe(4);

            expect(obj.$promise).toBeDefined();
            expect(obj.$promise.$isResolved).toBe(false);
            expect(obj.$promise.$resolved).toBeUndefined();

            $rootScope.$apply();

            expect(Object.keys(obj).sort().join(',')).toBe('a,b,c,d');

            expect(obj.a).toBe(1);
            expect(obj.b).toBe(2);
            expect(obj.c).toBe(3);
            expect(obj.d).toBe(4);

            expect(obj.$promise.$isResolved).toBe(true);
            expect(obj.$promise.$resolved).toBe(obj);
        }));


        it('it should merge an array to an object', inject(function (PromiseExtensions, $rootScope) {
            var obj = PromiseExtensions.resolveTo(arrayPromise, {1: 'x'});

            expect(Object.keys(obj).sort().join(',')).toBe('1');
            expect(obj[1]).toBe('x');

            $rootScope.$apply();

            expect(Object.keys(obj).sort().join(',')).toBe('0,1,2');

            expect(obj[0]).toBe('a');
            expect(obj[1]).toBe('b');
            expect(obj[2]).toBe('c');
        }));

        it('it should merge an array to an array', inject(function (PromiseExtensions, $rootScope) {
            var arr = PromiseExtensions.resolveTo(arrayPromise, ['x']);

            expect(arr.length).toBe(1);
            expect(arr[0]).toBe('x');

            $rootScope.$apply();

            expect(arr.length).toBe(4);
            expect(arr[0]).toBe('x');
            expect(arr[1]).toBe('a');
            expect(arr[2]).toBe('b');
            expect(arr[3]).toBe('c');
        }));

        it('it should merge a primitive to an array', inject(function (PromiseExtensions, $rootScope) {
            var arr = PromiseExtensions.resolveTo(stringPromise, ['x']);

            expect(arr.length).toBe(1);
            expect(arr[0]).toBe('x');

            $rootScope.$apply();

            expect(arr.length).toBe(2);
            expect(arr[0]).toBe('x');
            expect(arr[1]).toBe('abc');
        }));

        it('it should merge an object to an array', inject(function (PromiseExtensions, $rootScope) {
            var arr = PromiseExtensions.resolveTo(objectPromise, ['x']);

            expect(arr.length).toBe(1);
            expect(arr[0]).toBe('x');

            $rootScope.$apply();

            expect(arr.length).toBe(2);
            expect(arr[0]).toBe('x');
            expect(arr[1]).toBe(objectPromise.$r);
        }));


    });


});
