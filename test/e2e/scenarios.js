/**
 * RTFM: http://docs.angularjs.org/guide/dev_guide.e2e-testing
 */

describe('module: angular-restsource', function () {
    'use strict';

    beforeEach(function () {
        browser().navigateTo('../index.html');
    });


    it('should fetch a list of users', function () {

        expect(repeater('table tbody tr').count()).toEqual(3);

        // TODO: why is repeater broken?
        //expect(repeater('table tbody tr').row(0)).toEqual(['1', 'Luke']);
        //expect(repeater('table tbody tr').row(1)).toEqual(['2', 'Matt']);
        //expect(repeater('table tbody tr').row(2)).toEqual(['3', 'Tim']);

    });

});
