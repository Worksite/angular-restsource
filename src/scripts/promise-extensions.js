(function () {
    'use strict';

    function isSet(obj) {
        return obj !== undefined && obj !== null;
    }

    function isBoolean(obj) {
        return typeof obj === 'boolean';
    }


    var PromiseExtensions = function (promise) {

        if (!promise || !angular.isFunction(promise.then)) {
            throw 'Invalid argument: not a promise';
        }

        if (promise instanceof PromiseExtensions) {
            return promise;
        }

        var _self = this;

        var _super = {
            then: promise.then,
            catch: promise.catch,
            finally: promise.finally,
            success: promise.success,
            error: promise.error

        };

        angular.extend(this, promise);

        this.then = function () {
            return new PromiseExtensions(_super.then.apply(_self, arguments));
        };

        this.catch = function () {
            return new PromiseExtensions(_super.catch.apply(_self, arguments));
        };

        this.finally = function () {
            return new PromiseExtensions(_super.finally.apply(_self, arguments));
        };

        this.spread = function (callback, errback) {
            return _self.then(function (records) {
                return callback.apply(this, records);
            }, errback);
        };

        this.get = function (key) {
            return _self.then(function (res) {
                return res[key];
            });
        };

        this.map = function (transformer) {
            return _self.then(function (records) {
                return records.map(transformer);
            });
        };

        this.filter = function (predicate) {
            return _self.then(function (records) {
                return records.filter(predicate);
            });
        };

        this.reduce = function (iterator, initialValue) {
            return _self.then(function (records) {
                return records.reduce(iterator, initialValue);
            });
        };

        this.sort = function (comparator) {
            return _self.then(function (records) {
                records.sort(comparator);
                return records;
            });
        };

        this.index = function (property, transformer) {
            return _self.reduce(function (index, record) {
                var key = angular.isFunction(property) ? property(record) : record[property];
                index[key] = angular.isFunction(transformer) ? transformer(record) : record;
                return index;
            }, {});
        };

        this.indexOf = function (record) {
            return _self.then(function (records) {
                return records.indexOf(record);
            });
        };

        this.resolveTo = function (obj, mergeFn, resolveToFn) {
            if (angular.isFunction(resolveToFn)) {
                return resolveToFn(_self, obj, mergeFn);
            }

            return angular.isArray(obj) ?
                PromiseExtensions.resolveToArray(_self, obj, mergeFn) :
                PromiseExtensions.resolveTo(_self, obj, mergeFn);
        };

    };

    PromiseExtensions.extend = function (promise) {
        return new PromiseExtensions(promise);
    };

    PromiseExtensions.index = function (promise, property, transformer) {
        return PromiseExtensions.extend(promise).index(property, transformer);
    };

    PromiseExtensions.map = function (promise, transformer) {
        return PromiseExtensions.extend(promise).map(transformer);
    };

    PromiseExtensions.spread = function (promise, callback, errback) {
        return PromiseExtensions.extend(promise).spread(callback, errback);
    };

    /**
     * Merges the resolved promise value with the passed `obj`.
     *
     * By default:
     * - arrays are merged by pushing each item to the array obj
     * - objects are merged with `angular.extend`
     *
     * Pass a `mergeFn` define a custom merging strategy.
     *
     * @param promise Promise
     * @param obj Object
     * @param [mergeFn] Function
     */
    PromiseExtensions.resolveTo = function (promise, obj, mergeFn) {
        if (angular.isString(obj) || angular.isNumber(obj) || isBoolean(obj)) {
            throw 'Invalid argument: cannot resolve to primitive';
        }

        var _primitive;
        var _rejection;
        var _resolved = false;
        var _super = {
            valueOf: obj.valueOf,
            toString: obj.toString,
            then: promise.then,
            catch: promise.catch,
            finally: promise.finally
        };
        var _mergeFn = angular.isFunction(mergeFn) ? mergeFn : PromiseExtensions.merge;

        var _promise = promise.then(function (resolved) {
            _resolved = true;
            if (angular.isString(resolved) || angular.isNumber(resolved) || isBoolean(resolved)) {
                _primitive = resolved;
            }
            return _mergeFn(obj, resolved);
        });

        promise.catch(function (rejection) {
            _rejection = rejection;
            _resolved = true;
        });

        Object.defineProperty(obj, '$promise', {
            get: function () {
                return _promise;
            }
        });

        Object.defineProperty(obj, '$primitive', {
            get: function () {
                return _primitive;
            }
        });

        Object.defineProperty(obj, '$rejection', {
            get: function () {
                return _rejection;
            }
        });

        Object.defineProperty(obj, '$isResolved', {
            get: function () {
                return _resolved;
            }
        });


        /**
         * Override `valueOf` to support resolving primitives
         * @returns {*}
         */
        obj.valueOf = function () {
            return isSet(_primitive) ? _primitive : _super.valueOf.call(obj);
        };

        /**
         * Override `toString` to support resolving primitives
         * @returns string
         */
        obj.toString = function () {
            return isSet(_primitive) ? _primitive.toString() : _super.toString.call(obj);
        };

        obj.$then = function () {
            return _super.then.apply(_promise, arguments);
        };

        obj.$catch = function () {
            return _super.catch.apply(_promise, arguments);
        };

        obj.$finally = function () {
            return _super.finally.apply(_promise, arguments);
        };


        /**
         * Provide promise-like aliases
         */
        obj.then = obj.$then;
        obj.catch = obj.$catch;
        obj.finally = obj.$finally;

        /**
         * Returns a promise to get the named property of an object.
         * @param key
         */
        obj.$get = function (key) {
            return obj.$then(function (results) {
                return results[key];
            });
        };

        return obj;
    };

    PromiseExtensions.merge = function (obj, resolved) {
        if (angular.isArray(resolved) && angular.isArray(obj)) {
            resolved.forEach(function (item) {
                obj.push(item);
            });
            return obj;
        }
        if (angular.isObject(resolved) && angular.isObject(obj)) {
            angular.extend(obj, resolved);
            return obj;
        }
        return resolved;
    };

    PromiseExtensions.resolveToArray = function (promise, arr, mergeFn) {

        PromiseExtensions.resolveTo(promise, arr, mergeFn);

        Object.defineProperty(arr, '$length', {
            get: function () {
                return arr.$then(function (records) {
                    return records.length;
                });
            }
        });

        arr.$spread = function (callback, errback) {
            return arr.$then(function (records) {
                return callback.apply(this, records);
            }, errback);
        };

        arr.$map = function (transformer) {
            return arr
                .$then(function (records) {
                    return records.map(transformer);
                });
        };

        arr.$filter = function (predicate) {
            return arr.$then(function (records) {
                return records.filter(predicate);
            });
        };

        arr.$reduce = function (iterator, initialValue) {
            return arr.$then(function (records) {
                return records.reduce(iterator, initialValue);
            });
        };

        arr.$forEach = function (iterator) {
            return arr.$then(function (records) {
                records.forEach(iterator);
            });
        };

        arr.$sort = function (comparator) {
            return arr.$then(function (records) {
                records.sort(comparator);
            });
        };

        arr.$indexOf = function (record) {
            return arr.$then(function (records) {
                return records.indexOf(record);
            });
        };

        /**
         * Construct an `index` from the resolved value of a promise
         * using a particular property.
         *
         * Optionally transform the record before adding it to
         * the index.
         *
         * @param property
         * @param transformer
         * @returns {Promise}
         */
        arr.$index = function (property, transformer) {
            return arr.$reduce(function (index, record) {
                var key = angular.isFunction(property) ? property(record) : record[property];
                index[key] = angular.isFunction(transformer) ? transformer(record) : record;
                return index;
            }, {});
        };

        return arr;
    };


    PromiseExtensions.resolveToStore = function (promise, arr, mergeFn) {

        PromiseExtensions.resolveToArray(promise, arr, mergeFn);

        var _super = {
            $index: arr.$index
        };

        var _indexes = {
            id: _super.$index('id')
        };


        function updateIndexes(record) {
            return arr.$indexes().then(function (indexes) {
                var exists = false;
                angular.forEach(indexes, function (index, property) {
                    var key = record[property];
                    var value = index[key];
                    if (!value) {
                        index[key] = record;
                    } else {
                        exists = true;
                    }
                });
                return exists;
            });
        }

        /**
         * Gets or creates an index of models based on the passed property and transformer.
         * @param {String} [property='id'] Model property used to create the index
         * @param {Function} [transformer] Model transformer function used to create the index
         * @returns {Promise} a promise for the index
         */
        arr.$index = function (property, transformer) {
            var key = property || 'id';
            var index = _indexes[key];
            if (!index) {
                _indexes[key] = _super.$index(key, transformer);
            }
            return _indexes[key];
        };

        /**
         * @returns {Promise} a promise for all indexes
         */
        arr.$indexes = function () {
            return PromiseExtensions.all(_indexes);
        };

        /**
         * Returns a record from the promise by the record id
         * @param {Number} id Model ID
         * @returns {Promise} a promise for the record
         */
        arr.$read = function (id) {
            return _indexes.id.then(function (map) {
                return map[id];
            });
        };

        /**
         * Updates the record instance
         * @param {Object} record
         * @returns {Promise} a promise for the record
         */
        arr.$update = function (record) {
            return _indexes.id.then(function (index) {
                var updated = index[record.id];
                if (!updated) {
                    return PromiseExtensions.reject('record not found');
                }
                angular.extend(updated, record);
                return updated;
            });
        };

        arr.$save = function (record) {
            return _indexes.id.then(function (index) {
                return index[record.id] ?
                    arr.$update(record) :
                    arr.$push(record);
            });
        };

        arr.$saveAll = function (records) {
            return PromiseExtensions.all(records.map(arr.$save));
        };

        /**
         * Adds a record to the end of the list
         * @param {Object} record
         * @returns {Promise} a promise for the record
         */
        arr.$push = function (record) {
            return updateIndexes(record).then(function () {
                arr.push(record);
                return record;
            });
        };

        arr.$pushAll = function (records) {
            return PromiseExtensions.all(records.map(arr.$push));
        };


        /**
         * Adds a record to the beginning of the list
         * @param {Object} record
         * @returns {Promise} a promise for the record
         */
        arr.$unshift = function (record) {
            return updateIndexes(record).then(function () {
                arr.unshift(record);
                return record;
            });
        };


        arr.$insert = function (position, record) {
            return updateIndexes(record).then(function () {
                arr.insert(position, record);
                return record;
            });
        };


        /**
         * Removes the model from the list of records and all indexes
         * @param {Number} recordOrId Model ID
         * @returns {Promise} a promise for the model
         */
        arr.$remove = function (recordOrId) {
            return arr.$indexes().then(function (indexes) {
                var record = indexes.id[recordOrId] || indexes.id[recordOrId.id];
                if (!record) {
                    return undefined;
                }
                angular.forEach(indexes, function (index, property) {
                    var key = record[property];
                    delete index[key];
                });
                var idx = arr.indexOf(record);
                if (idx > -1) {
                    arr.splice(idx, 1);
                }
                return record;
            });
        };

        arr.$removeAll = function (records) {
            return PromiseExtensions.all(records.map(arr.$remove));
        };

        arr.$clear = function () {
            return arr.$indexes().then(function (indexes) {
                angular.forEach(indexes, function (index) {
                    Object.keys(index).forEach(function (key) {
                        delete index[key];
                    });
                });
                arr.length = 0;
                return arr;
            });
        };

        return arr;
    };


    angular.module('angular-restsource.promise-extensions', [])
        .factory('PromiseExtensions', ['$q', function ($q) {

            angular.forEach(['defer', 'reject'], function (delegateCall) {
                PromiseExtensions[delegateCall] = $q[delegateCall];
            });

            PromiseExtensions.all = function (promises) {
                return PromiseExtensions.extend($q.all(promises));
            };

            PromiseExtensions.when = function () {
                return PromiseExtensions.extend($q.when.apply($q, arguments));
            };

            PromiseExtensions.reject = function (obj) {
                return PromiseExtensions.extend($q.reject(obj));
            };

            return PromiseExtensions;
        }])
        .run(['PromiseExtensions', function (PromiseExtensions) {
            // make sure `PromiseExtensions.all` and etc are created
        }]);
}());
