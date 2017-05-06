import * as mocha from 'mocha';
import * as chai from 'chai';

import { HowLongToBeatService, HowLongToBeatEntry } from '../../main/ts/howlongtobeat';

const expect = chai.expect;
const assert = chai.assert;

describe('Integration-Testing HowLongToBeatService', () => {

  describe('Test for detail()', () => {

    it('should load entry for 2224 (Dark Souls)', () => {
      return new HowLongToBeatService().detail('2224').then((entry) => {
        assert.isNotNull(entry);
        assert.strictEqual(entry.id, '2224');
        assert.strictEqual(entry.name, 'Dark Souls');
        assert.strictEqual(entry.imageUrl, 'https://howlongtobeat.com/gameimages/Dark_Souls_Cover_Art.jpg');
        assert.strictEqual(entry.gameplayMain, 49);
        assert.strictEqual(entry.gameplayCompletionist, 110);
      });
    });

    it('should fail to load entry for 123 (404)', () => {
      return assert.isRejected(new HowLongToBeatService().detail('123'));
    });
  });


  describe('Test for search()', () => {
    it('should have no search results when searching for dorks', () => {
      return new HowLongToBeatService().search('dorks').then((result) => {
        assert.isNotNull(result);
        assert.strictEqual(result.length, 0);
      });
    });

    it('should have 3 search results when searching for dark souls III', () => {
      return new HowLongToBeatService().search('dark souls III').then((result) => {
        assert.isNotNull(result);
        assert.strictEqual(result.length, 3);
        assert.strictEqual(result[0].id, '26803');
        assert.strictEqual(result[0].name, 'Dark Souls III');
        assert.strictEqual(result[0].imageUrl, 'https://howlongtobeat.com/gameimages/Dark_souls_3_cover_art.jpg');
        assert.strictEqual(result[0].gameplayMain, 31.5);
        assert.strictEqual(result[0].gameplayCompletionist, 81.5);
      });
    });

    it('should have 1 search results with 100% similarity when searching for Persona 4: Golden', () => {
      return new HowLongToBeatService().search('Persona 4: Golden').then((result) => {
        assert.isNotNull(result);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].similarity, 1);
      });
    });
  });


});
