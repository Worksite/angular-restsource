describe('Module: ArrayCache', function () {
    'use strict';

    describe('ArrayCache instance', function () {

        var pojos = [
            {id: 1, name: 'aaa'},
            {id: 2, name: 'bbb'},
            {id: 3, name: 'ccc'}
        ];

        var arrayCache;

        beforeEach(function () {
            arrayCache = new Restsource.ArrayCache(pojos);
        });

        it('should contain 3 records', function () {
            expect(arrayCache.length).toBe(3);
        });

        it('should support reading records', function () {
            expect(arrayCache.read(1).name).toBe('aaa');
            expect(arrayCache.read(2).name).toBe('bbb');
            expect(arrayCache.read(3).name).toBe('ccc');
        });


        it('should create an ID index', function () {
            var idIndex = arrayCache.index('id');
            expect(idIndex).toBeDefined();
            expect(idIndex[1].name).toBe('aaa');
            expect(idIndex[2].name).toBe('bbb');
            expect(idIndex[3].name).toBe('ccc');
        });

        it('should support forEach', function () {
            var iterator = jasmine.createSpy('iterator');

            arrayCache.forEach(function (record, index) {
                iterator(record.id, index);
            });

            expect(iterator).toHaveBeenCalledWith(1, 0);
            expect(iterator).toHaveBeenCalledWith(2, 1);
            expect(iterator).toHaveBeenCalledWith(3, 2);
            expect(iterator.callCount).toBe(3);
        });

        it('should support map', function () {
            var res = arrayCache.map(function (record, index) {
                return record.id + index;
            });

            expect(res[0]).toBe(1);
            expect(res[1]).toBe(3);
            expect(res[2]).toBe(5);
            expect(res.length).toBe(3);
        });

        it('should support filter', function () {
            var res = arrayCache.filter(function (record, index) {
                return record.id + index === 5;
            });

            expect(res[0].id).toBe(3);
            expect(res.length).toBe(1);
        });

        it('should support reduce', function () {
            var res = arrayCache.reduce(function (sum, record, index) {
                return sum + record.id + index;
            }, 0);

            expect(res).toBe(9);
        });

        it('should support sort', function () {

            expect(arrayCache.get(0).id).toBe(1);
            expect(arrayCache.get(1).id).toBe(2);
            expect(arrayCache.get(2).id).toBe(3);


            arrayCache.sort(function (o1, o2) {
                return o2.id - o1.id;
            });

            expect(arrayCache.get(0).id).toBe(3);
            expect(arrayCache.get(1).id).toBe(2);
            expect(arrayCache.get(2).id).toBe(1);
        });

        it('should support indexOf', function () {

            var record = arrayCache.read(2);

            expect(arrayCache.indexOf(record)).toBe(1);
            expect(arrayCache.indexOf(angular.copy(record))).toBe(-1);

        });

        it('toArray should return a new array of the records', function () {

            var array = arrayCache.toArray();

            expect(array.length).toBe(3);
            expect(array[0]).toBe(arrayCache.get(0));
            expect(array[1]).toBe(arrayCache.get(1));
            expect(array[2]).toBe(arrayCache.get(2));

            array.length = 1;

            expect(arrayCache.length).toBe(3);

        });


        describe('save', function () {

            it('should throw an error if the record does not have a primary ID', function () {
                expect(function () {
                    arrayCache.save({name: 'zzz'});

                }).toThrow('ArrayCache::save: record has no primary id');
            });

            it('should support saving a new record', function () {

                expect(arrayCache.length).toBe(3);

                var record = {id: 4, name: 'ddd'};
                arrayCache.save(record);

                expect(arrayCache.length).toBe(4);
                expect(arrayCache.get(3)).toBe(record);
                expect(arrayCache.read(4)).toBe(record);

            });

            it('should support saving an existing record', function () {

                var existing = arrayCache.read(2);

                expect(existing.name).toBe('bbb');

                arrayCache.save({id: 2, name: 'BBB'});

                expect(arrayCache.length).toBe(3);
                expect(arrayCache.read(2)).toBe(existing);
                expect(existing.name).toBe('BBB');

            });

            it('should support saving an array of records', function () {

                var records = [
                    {id: 4, name: 'ddd'},
                    {id: 2, name: 'BBB'}
                ];

                expect(arrayCache.length).toBe(3);

                arrayCache.save(records);

                expect(arrayCache.length).toBe(4);

                expect(arrayCache.read(2).name).toBe('BBB');
                expect(arrayCache.read(4).name).toBe('ddd');

            });

        });

        describe('remove', function () {

            it('should remove a record by id', function () {

                var record = arrayCache.read(2);

                var removed = arrayCache.remove(record.id);

                expect(removed).toBe(record);
                expect(arrayCache.read(2)).toBeUndefined();
            });

            it('should remove a record', function () {

                var record = arrayCache.read(2);

                var removed = arrayCache.remove(record);

                expect(removed).toBe(record);
                expect(arrayCache.read(2)).toBeUndefined();
            });

            it('should remove an array of records or ids', function () {
                var record = arrayCache.read(2);

                var removed = arrayCache.remove([record, 3]);

                expect(arrayCache.length).toBe(1);
                expect(arrayCache.get(0).id).toBe(1);
                expect(arrayCache.read(1)).toBeDefined();
                expect(arrayCache.read(2)).toBeUndefined();
                expect(arrayCache.read(3)).toBeUndefined();
            });

        });

        describe('length', function () {

            it('should support truncating the cache', function () {
                expect(arrayCache.length).toBe(3);
                arrayCache.length = 1;

                expect(arrayCache.length).toBe(1);

                expect(arrayCache.get(0)).toBeDefined();
                expect(arrayCache.get(0).id).toBe(1);
                expect(arrayCache.get(1)).toBeUndefined();
                expect(arrayCache.get(2)).toBeUndefined();

                expect(arrayCache.read(1)).toBeDefined();
                expect(arrayCache.read(2)).toBeUndefined();
                expect(arrayCache.read(3)).toBeUndefined();
            });

            it('should not support increasing the the length of the cache', function () {
                expect(arrayCache.length).toBe(3);

                arrayCache.length = 10;

                expect(arrayCache.length).toBe(3);
            });

        });

    });
});
