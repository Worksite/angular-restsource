(function (exports) {
    'use strict';

    var NODE_TYPE_ELEMENT = 1;

    function isWindow(obj) {
        return obj && obj.window === obj;
    }

    var ArrayUtils = {

        createIndex: function (array, property, transformer) {
            return array.reduce(function (index, record) {
                var key = angular.isFunction(property) ? property(record) : record[property];
                index[key] = angular.isFunction(transformer) ? transformer(record) : record;
                return index;
            }, {});
        },

        /**
         * Avoid leaking arguments which prevents optimizations in JavaScript engines.
         * See https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
         * @param {Arguments|Array} arrayLike
         * @returns {Array}
         */
        toArray: function (arrayLike) {
            var args = new Array(arrayLike.length);
            for (var i = 0; i < args.length; ++i) {
                args[i] = arrayLike[i];
            }
            return args;
        },

        // pulled from angular 1.4.4
        isArrayLike: function (obj) {
            if (obj === null || obj === undefined || isWindow(obj)) {
                return false;
            }

            // Support: iOS 8.2 (not reproducible in simulator)
            // "length" in obj used to prevent JIT error (gh-11508)
            var length = 'length' in Object(obj) && obj.length;

            if (obj.nodeType === NODE_TYPE_ELEMENT && length) {
                return true;
            }

            return angular.isString(obj) || angular.isArray(obj) || length === 0 ||
                typeof length === 'number' && length > 0 && (length - 1) in obj;
        }
    };

    /**
     * @Class ArrayCache
     * An array-like structure with CRUD methods
     * @param records
     * @param primaryIdField
     * @constructor
     */
    var ArrayCache = function (records, primaryIdField) {
        var _self = this;
        var _records = [];
        var _primaryIdField = primaryIdField || 'id';
        var _indexes = {};

        _indexes[_primaryIdField] = {};

        function _addRecordToIndexes(record) {
            return Object.keys(_indexes).reduce(function (exits, property) {
                var index = _indexes[property];
                var key = record[property];
                var value = index[key];
                if (!value) {
                    index[key] = record;
                    return exits;
                }
                return true;
            }, false);
        }

        ['forEach', 'map', 'filter', 'reduce', 'sort', 'indexOf'].forEach(function (method) {
            _self[method] = function () {
                return _records[method].apply(_records, arguments);
            };
        });

        Object.defineProperty(this, 'length', {
            get: function () {
                return _records.length;
            },
            set: function (length) {
                var numToRemove = _records.length - length;
                if (numToRemove <= 0) {
                    return;
                }
                _records.splice(length, numToRemove).forEach(_self.remove);
            }
        });

        this.read = function (id) {
            return _indexes[_primaryIdField] ? _indexes[_primaryIdField][id] : null;
        };

        this.get = function (index) {
            return _records[index];
        };

        this.save = function (record) {
            if (arguments.length > 1) {
                return _self.save(ArrayUtils.toArray(arguments));
            }
            if (angular.isArray(record)) {
                return record.map(function (r) {
                    return _self.save(r);
                });
            }
            var primaryId = record[_primaryIdField];
            if (primaryId === null || primaryId === undefined) {
                throw 'ArrayCache::save: record has no primary id';
            }
            var existing = _self.read(primaryId);
            _addRecordToIndexes(record);
            if (existing) {
                angular.extend(existing, record);
                return existing;
            } else {
                _records.push(record);
                return record;
            }
        };

        this.push = this.save;


        this.remove = function (recordOrId) {
            if (angular.isArray(recordOrId)) {
                return recordOrId.map(_self.remove);
            }

            var record = _self.read(recordOrId) || _self.read(recordOrId[_primaryIdField]);
            if (!record) {
                return undefined;
            }
            angular.forEach(_indexes, function (index, property) {
                var key = record[property];
                delete index[key];
            });
            var idx = _records.indexOf(record);
            if (idx > -1) {
                _records.splice(idx, 1);
            }
            return record;
        };

        this.index = function (property, transformer) {
            var key = property || 'id';
            var index = _indexes[key];
            if (!index) {
                _indexes[key] = ArrayUtils.createIndex(_records, key, transformer);
            }
            return _indexes[key];
        };

        this.toArray = function () {
            return [].concat(_records);
        };

        if (angular.isArray(records)) {
            this.save(records);
        }
    };

    exports.Restsource = {
        ArrayUtils: ArrayUtils,
        ArrayCache: ArrayCache
    };

}(window));
