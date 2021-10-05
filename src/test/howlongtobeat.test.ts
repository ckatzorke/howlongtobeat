import * as mocha from 'mocha';
import * as chai from 'chai';
import * as fs from 'fs';

import { HowLongToBeatParser } from '../main/howlongtobeat';

const expect = chai.expect;
const assert = chai.assert;

describe('Testing HowLongToBeatParser', () => {
  describe('Test for calcDistancePercentage()', () => {
    it('dark souls and dark souls should have 100% similarity', () => {
      let perc = HowLongToBeatParser.calcDistancePercentage(
        'Dark Souls',
        'Dark Souls'
      );
      assert.strictEqual(perc, 1);
    });

    it('dark souls and dark soul should have 90% similarity', () => {
      let perc = HowLongToBeatParser.calcDistancePercentage(
        'Dark Souls',
        'Dark Soul'
      );
      assert.strictEqual(perc, 0.9);
    });
  });

  describe('Test for parseSearch, if this succeeds, but live installment fails, howlongtobeat.com may have changed their html', () => {
    it('should parse the search result (static, from search of Persona 4)', () => {
      let html = fs.readFileSync('src/test/resources/search.html', 'utf-8');
      let results = HowLongToBeatParser.parseSearch(html, 'Persona 4');
      assert.isTrue(results.length === 5);
      assert.strictEqual(results[0].name, 'Persona 4: Golden');
      assert.strictEqual(results[0].searchTerm, 'Persona 4');
      assert.strictEqual(results[0].similarity, 0.53);
      assert.strictEqual(
        results[0].imageUrl,
        'https://howlongtobeat.com/gameimages/persona_4_golden_large.jpg'
      );
      //
      assert.strictEqual(results[2].gameplayCompletionist, 18.5);
      //special case with range
      assert.strictEqual(results[3].gameplayMain, 18);
      assert.strictEqual(results[3].gameplayMainExtra, 20.5);
      assert.strictEqual(results[4].gameplayMain, 10);
      assert.strictEqual(results[4].gameplayMainExtra, 16);
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
      assert.strictEqual(detail.playableOn.length, 3);
      assert.strictEqual(detail.platforms.length, 3);
      assert.strictEqual(detail.gameplayCompletionist, 17);
      assert.strictEqual(detail.gameplayMain, 10);
      assert.strictEqual(detail.gameplayMainExtra, 10.5);
    });
  });

  describe('Test for parsing minutes correctly from detail page. Example is Street Fighter which claims to take 50 Mins to beat (main)', () => {
    it('should parse the main time correctly  (static, from id=9224 - Street Fighter, takes 50 Minutes)', () => {
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
      assert.strictEqual(detail.gameplayMainExtra, 1);
      assert.strictEqual(detail.gameplayCompletionist, 3.5);
    });
  });

  describe('Test for parsing minutes correctly from search list. Example is Street Fighter which claims to take 50 Mins to beat (main)', () => {
    it('should parse the main time correctly from search (static, from search "Street Fighter")', () => {
      const html = fs.readFileSync(
        'src/test/resources/search_street_fighter.html',
        'utf-8'
      );
      const search = HowLongToBeatParser.parseSearch(html, 'Street Fighter');
      assert.isDefined(search);
      assert.strictEqual(search.length, 18);
      const streetFighter = search[0];
      assert.strictEqual(streetFighter.name, 'Street Fighter');
      assert.strictEqual(streetFighter.searchTerm, 'Street Fighter');
      assert.strictEqual(streetFighter.gameplayMain, 1);
      assert.strictEqual(streetFighter.gameplayMainExtra, 1);
      assert.strictEqual(streetFighter.gameplayCompletionist, 3.5);
      const streetFighterAlpha = search[15];
      assert.strictEqual(
        streetFighterAlpha.name,
        "Street Fighter Alpha: Warriors' Dreams"
      );
      assert.strictEqual(streetFighterAlpha.gameplayMain, 1);
      assert.strictEqual(streetFighterAlpha.gameplayMainExtra, 2.5);
      assert.strictEqual(streetFighterAlpha.gameplayCompletionist, 3.5);
    });
  });
  describe('Test for parsing minutes correctly from detail page. Example is Guns of Icarus Online which does not have Co-Op time but it has Vs.', () => {
    it('should parse the Co-Op and Vs. time correctly  (static, from id=4216 - Street Fighter, takes 0 Minutes and 20.5 for Vs.)', () => {
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
      assert.strictEqual(detail.gameplayCompletionist, 20.5);
    });
  });
  describe('Test for parsing minutes & Time Label correctly from search list. The examples are Grand Theft Auto V and Grand Theft Auto Online which has different time labels', () => {
    it('should parse the 3 times correctly and the according time labels from search (static, from search "Grand Theft Auto")', () => {
      const html = fs.readFileSync(
        'src/test/resources/search_grand_theft_auto.html',
        'utf-8'
      );
      const search = HowLongToBeatParser.parseSearch(html, 'Grand Theft Auto');
      assert.isDefined(search);
      assert.strictEqual(search.length, 18);
      const gtaV = search[2];
      assert.strictEqual(gtaV.name, 'Grand Theft Auto V');
      assert.strictEqual(gtaV.searchTerm, 'Grand Theft Auto');
      assert.strictEqual(gtaV.gameplayMain, 31);
      assert.strictEqual(gtaV.gameplayMainExtra, 46.5);
      assert.strictEqual(gtaV.gameplayCompletionist, 78.5);

      let gtaVTimeLabels = [['gameplayMain', 'Main Story'], ['gameplayMainExtra', 'Main + Extra'], ['gameplayCompletionist', 'Completionist']];
      expect(gtaV.timeLabels).to.eql(gtaVTimeLabels);

      const gtaOnline = search[15];
      assert.strictEqual(
        gtaOnline.name,
        'Grand Theft Auto Online'
      );
      assert.strictEqual(
        gtaOnline.searchTerm,
        'Grand Theft Auto'
      );
      assert.strictEqual(gtaOnline.gameplayMain, 32.5);
      assert.strictEqual(gtaOnline.gameplayMainExtra, 28);
      assert.strictEqual(gtaOnline.gameplayCompletionist, 67);

      let gtaOnlineTimeLabels = [['gameplayMain', 'Solo'], ['gameplayMainExtra', 'Co-Op'], ['gameplayCompletionist', 'Vs.']];
      expect(gtaOnline.timeLabels).to.eql(gtaOnlineTimeLabels);
    });
  });
  describe('Test for getting game name with year on it.', () => {
    it('should have year of the game God of War in gameNameComplete', () => {
      const html = fs.readFileSync(
        'src/test/resources/search_god_of_war.html',
        'utf-8'
      );
      const search = HowLongToBeatParser.parseSearch(html, 'God of War');
      assert.isDefined(search);
      assert.strictEqual(search.length, 15);
      const god2018 = search[0];
      assert.strictEqual(god2018.name, 'God of War');

      expect(god2018.nameComplete).to.eql('God of War (2018)');
      
      const god2015 = search[1];
      assert.strictEqual(god2015.name, 'God of War');
      
      expect(god2015.nameComplete).to.eql('God of War (2005)');
    });

    it('should not have year of the game God of War in gameName', () => {
      const html = fs.readFileSync(
        'src/test/resources/search_god_of_war.html',
        'utf-8'
      );
      const search = HowLongToBeatParser.parseSearch(html, 'God of War');
      assert.isDefined(search);
      assert.strictEqual(search.length, 15);
      const god2018 = search[0];

      expect(god2018.name).to.eql('God of War');
      
      const god2015 = search[1];
      
      expect(god2015.name).to.eql('God of War');
    });

    it('should not have year of the game Grand Theft Auto in gameNameComplete', () => {
      const html = fs.readFileSync(
        'src/test/resources/search_grand_theft_auto.html',
        'utf-8'
      );
      const search = HowLongToBeatParser.parseSearch(html, 'Grand Theft Auto');
      assert.isDefined(search);
      assert.strictEqual(search.length, 18);

      const gtaV = search[2];
      assert.strictEqual(gtaV.name, 'Grand Theft Auto V');
      assert.strictEqual(gtaV.nameComplete, 'Grand Theft Auto V');

    });
  });
});
