"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const howlongtobeat_1 = require("../main/howlongtobeat");
const expect = chai.expect;
const assert = chai.assert;
describe('Integration-Testing HowLongToBeatService', () => {
    describe('Test for detail()', () => {
        it('should load entry for 2224 (Dark Souls)', () => {
            return new howlongtobeat_1.HowLongToBeatService().detail('2224').then((entry) => {
                assert.isNotNull(entry);
                assert.strictEqual(entry.id, '2224');
                assert.strictEqual(entry.name, 'Dark Souls');
                assert.strictEqual(entry.imageUrl, 'https://howlongtobeat.com/gameimages/Dark_Souls_Cover_Art.jpg');
                assert.isTrue(entry.gameplayMain > 40);
                assert.isTrue(entry.gameplayCompletionist > 100);
            });
        });
        it('should fail to load entry for 123 (404)', () => {
            return assert.isRejected(new howlongtobeat_1.HowLongToBeatService().detail('123'));
        });
    });
    describe('Test for search()', () => {
        it('should have no search results when searching for dorks', () => {
            return new howlongtobeat_1.HowLongToBeatService().search('dorks').then((result) => {
                assert.isNotNull(result);
                assert.strictEqual(result.length, 0);
            });
        });
        it('should have at least 3 search results when searching for dark souls III', () => {
            return new howlongtobeat_1.HowLongToBeatService().search('dark souls III').then((result) => {
                assert.isNotNull(result);
                assert.isTrue(result.length > 3);
                assert.strictEqual(result[0].id, '26803');
                assert.strictEqual(result[0].name, 'Dark Souls III');
                assert.strictEqual(result[0].imageUrl, 'https://howlongtobeat.com/gameimages/Dark_souls_3_cover_art.jpg');
                assert.isTrue(result[0].gameplayMain > 30);
                assert.isTrue(result[0].gameplayCompletionist > 80);
            });
        });
        it('should have 1 search results with 100% similarity when searching for Persona 4: Golden', () => {
            return new howlongtobeat_1.HowLongToBeatService().search('Persona 4 Golden').then((result) => {
                assert.isNotNull(result);
                assert.strictEqual(result.length, 1);
                //assert.strictEqual(result[0].similarity, 1);
            });
        });
        it('Entries without any time settings (e.g. "Surge") should have a zero hour result', () => {
            return new howlongtobeat_1.HowLongToBeatService().search('Surge').then((result) => {
                console.log(result);
                assert.isNotNull(result);
                assert.isTrue(result.length > 1);
                assert.strictEqual(result[0].gameplayMain, 0);
            });
        });
    });
});
//# sourceMappingURL=howlongtobeat.integration.test.js.map