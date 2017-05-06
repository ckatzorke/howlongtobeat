import * as mocha from 'mocha';
import * as chai from 'chai';

import { HowLongToBeatParser } from '../../main/ts/howlongtobeat';

const expect = chai.expect;
const assert = chai.assert;

describe('Testing HowLongToBeatParser', () => {

  describe('Test for calcDistancePercentage()', () => {

    it('dark souls and dark souls should have 100% similarity', () => {
      let perc = HowLongToBeatParser.calcDistancePercentage('Dark Souls', 'Dark Souls');
      assert.strictEqual(perc, 1);
    });

    it('dark souls and dark soul should have 90% similarity', () => {
      let perc = HowLongToBeatParser.calcDistancePercentage('Dark Souls', 'Dark Soul');
      assert.strictEqual(perc, .9);
    });

  });

});
