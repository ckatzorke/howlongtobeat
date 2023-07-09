import * as mocha from 'mocha';
import * as chai from 'chai';
import * as fs from 'fs';

import { HowLongToBeatParser, HowLongToBeatService } from '../main/howlongtobeat';

const expect = chai.expect;
const assert = chai.assert;

describe('Testing HowLongToBeatParser', () => {
  describe('Test for calcDistancePercentage()', () => {
    it('dark souls and dark souls should have 100% similarity', () => {
      let perc = HowLongToBeatService.calcDistancePercentage(
        'Dark Souls',
        'Dark Souls'
      );
      assert.strictEqual(perc, 1);
    });

    it('dark souls and dark soul should have 90% similarity', () => {
      let perc = HowLongToBeatService.calcDistancePercentage(
        'Dark Souls',
        'Dark Soul'
      );
      assert.strictEqual(perc, 0.9);
    });
  });

 

  describe('Test for parseDetail, if this succeeds, but live installment fails, howlongtobeat.com may have changed their html', () => {
    it('should parse the details page  (static, from id=3978 - God of War 3)', () => {
      let html = fs.readFileSync(
        'src/test/resources/detail_gow3.html',
        'utf-8'
      );
      let detail = HowLongToBeatParser.parseDetails(html, '3978');
      assert.isDefined(detail);
      assert.strictEqual(detail.name, 'God of War III');
      assert.strictEqual(detail.searchTerm, 'God of War III');
      assert.strictEqual(detail.similarity, 1);
      assert.strictEqual(detail.playableOn.length, 2);
      assert.strictEqual(detail.platforms.length, 2);
      assert.strictEqual(detail.gameplayCompletionist, 17.5);
      assert.strictEqual(detail.gameplayMain, 10);
      assert.strictEqual(detail.gameplayMainExtra, 11);
    });
  });

  describe('Test for parsing minutes correctly from detail page. Example is Street Fighter which claims to take 1 Hours to beat (main)', () => {
    it('should parse the main time correctly  (static, from id=9224 - Street Fighter, takes 1 Hours)', () => {
      const html = fs.readFileSync(
        'src/test/resources/detail_street_fighter.html',
        'utf-8'
      );
      const detail = HowLongToBeatParser.parseDetails(html, '9224');
      assert.isDefined(detail);
      assert.strictEqual(detail.name, 'Street Fighter');
      assert.strictEqual(detail.searchTerm, 'Street Fighter');
      assert.strictEqual(detail.similarity, 1);
      //should be one, since 1 hours is the minimum
      assert.strictEqual(detail.gameplayMain, 1);
      assert.strictEqual(detail.gameplayMainExtra, 2.5);
      assert.strictEqual(detail.gameplayCompletionist, 4);
    });
  });

  
  describe('Test for parsing minutes correctly from detail page. Example is Guns of Icarus Online which does not have Co-Op time but it has Vs.', () => {
    it('should parse the Co-Op and Vs. time correctly  (static, from id=4216 - Guns of Icarus Online, takes 0 Minutes and 26 for Vs.)', () => {
      const html = fs.readFileSync(
        'src/test/resources/detail_guns_of_icarus_online.html',
        'utf-8'
      );
      const detail = HowLongToBeatParser.parseDetails(html, '4216');
      assert.isDefined(detail);
      assert.strictEqual(detail.name, 'Guns of Icarus Online');
      assert.strictEqual(detail.searchTerm, 'Guns of Icarus Online');
      assert.strictEqual(detail.similarity, 1);
      //should be one, since 1 hours is the minimum
      assert.strictEqual(detail.gameplayMain, 0);
      assert.strictEqual(detail.gameplayMainExtra, 0);
      assert.strictEqual(detail.gameplayCompletionist, 26);
    });
  });
  
});
