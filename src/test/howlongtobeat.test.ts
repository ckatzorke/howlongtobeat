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

  describe('Test for parseSearch, if this succeeds, but live installment fails, howlongtobeat.com may have changed their html', () => {
    it('should parse the search result (static, from search of Persona 4)', () => {
      let html = fs.readFileSync('src/test/resources/search.html', 'utf-8')
      let results = HowLongToBeatParser.parseSearch(html, 'Persona 4');
      assert.isTrue(results.length === 5);
      assert.strictEqual(results[0].name, 'Persona 4: Golden');
      assert.strictEqual(results[0].similarity, .53);
      assert.strictEqual(results[0].imageUrl, 'https://howlongtobeat.com/gameimages/persona_4_golden_large.jpg');
      //
      assert.strictEqual(results[2].gameplayCompletionist, 18.5);
      //special case with range
      assert.strictEqual(results[3].gameplayMain, 18);
      assert.strictEqual(results[4].gameplayMain, 10);
    });
  });

  describe('Test for parseDetail, if this succeeds, but live installment fails, howlongtobeat.com may have changed their html', () => {
    it('should parse the details page  (static, from id=3978 - God of War 3)', () => {
      let html = fs.readFileSync('src/test/resources/detail_gow3.html', 'utf-8')
      let detail = HowLongToBeatParser.parseDetails(html, '3978');
      assert.isDefined(detail);
      assert.strictEqual(detail.name, 'God of War III');
      assert.strictEqual(detail.similarity, 1);
      assert.strictEqual(detail.gameplayCompletionist, 17);
      assert.strictEqual(detail.gameplayMain, 10);
    });
  });

  describe('Test for parsing minutes correctly from detail page. Example is Street Fighter which claims to take 50 Mins to beat (main)', () => {
    it('should parse the main time correctly  (static, from id=9224 - Street Fighter, takes 50 Minutes)', () => {
      const html = fs.readFileSync('src/test/resources/detail_street_fighter.html', 'utf-8')
      const detail = HowLongToBeatParser.parseDetails(html, '9224');
      assert.isDefined(detail);
      assert.strictEqual(detail.name, 'Street Fighter');
      assert.strictEqual(detail.similarity, 1);
      //should be one, since 1 hours is the minimum
      assert.strictEqual(detail.gameplayMain, 1);
    });
  });

  describe('Test for parsing minutes correctly from search list. Example is Street Fighter which claims to take 50 Mins to beat (main)', () => {
    it('should parse the main time correctly from search (static, from search "Street Fighter")', () => {
      const html = fs.readFileSync('src/test/resources/search_street_fighter.html', 'utf-8')
      const search = HowLongToBeatParser.parseSearch(html, 'Street Fighter');
      assert.isDefined(search);
      assert.strictEqual(search.length, 18);
      const streetFighter = search[0];
      assert.strictEqual(streetFighter.name, 'Street Fighter');
      assert.strictEqual(streetFighter.gameplayMain, 1);
      assert.strictEqual(streetFighter.gameplayCompletionist, 3.5);
      const streetFighterAlpha = search[15];
      assert.strictEqual(streetFighterAlpha.name, 'Street Fighter Alpha: Warriors\' Dreams');
      assert.strictEqual(streetFighterAlpha.gameplayMain, 1);
      assert.strictEqual(streetFighterAlpha.gameplayCompletionist, 3.5);
    });
  });

});
