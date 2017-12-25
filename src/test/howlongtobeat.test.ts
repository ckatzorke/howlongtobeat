import * as mocha from 'mocha';
import * as chai from 'chai';
import * as fs from 'fs';

import { HowLongToBeatParser } from '../main/howlongtobeat';

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

  describe('Test for parseSearch, if this succeeds, butlive installment fails, howlongtobeat.com may have changed their html', () => {
    it('should parse the search result (static, from search of Persona 4)', () => {
      let html = fs.readFileSync('src/test/resources/search.html', 'utf-8')
      let results = HowLongToBeatParser.parseSearch(html, 'Persona 4');
      assert.isTrue(results.length === 5);
      assert.strictEqual(results[0].name, 'Persona 4: Golden');
      assert.strictEqual(results[0].similarity, .53);
      //
      assert.strictEqual(results[2].gameplayCompletionist, 18.5);
      assert.strictEqual(results[4].gameplayMain, 10);
    });
  });

});
