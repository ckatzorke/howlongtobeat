"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const howlongtobeat_1 = require("../main/howlongtobeat");
const assert = chai.assert;
describe('Integration-Testing HowLongToBeatService', () => {
    describe('Test for detail()', () => {
        it('should load entry for 2224 (Dark Souls)', () => {
            return new howlongtobeat_1.HowLongToBeatService().detail('2224').then((entry) => {
                // console.log(entry);
                assert.isNotNull(entry);
                assert.strictEqual(entry.id, '2224');
                assert.strictEqual(entry.name, 'Dark Souls');
                assert.strictEqual(entry.searchTerm, 'Dark Souls');
                assert.isString(entry.imageUrl);
                assert.isArray(entry.platforms);
                assert.strictEqual(entry.platforms.length, 4);
                // backward compatible test
                assert.strictEqual(entry.playableOn.length, 4);
                assert.isTrue(entry.description.includes('Live Through A Million Deaths & Earn Your Legacy.'));
                assert.isTrue(entry.gameplayMain > 40);
                assert.isTrue(entry.gameplayCompletionist > 100);
            });
        });
        it('should abort loading entry for 2224 (Dark Souls)', () => {
            const abortController = new AbortController();
            abortController.abort();
            return new howlongtobeat_1.HowLongToBeatService().detail('2224', abortController.signal).then(() => {
                assert.fail();
            }).catch(e => {
                assert.include(e.message.toLowerCase(), 'cancel');
            });
        });
        it('should fail to load entry for 123 (404)', () => {
            return new howlongtobeat_1.HowLongToBeatService().detail('123').then(() => {
                assert.fail();
            }).catch(e => {
                assert.isOk(e.message);
            });
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
                assert.isTrue(result.length >= 3);
                assert.strictEqual(result[0].id, '26803');
                assert.strictEqual(result[0].name, 'Dark Souls III');
                assert.isTrue(result[0].gameplayMain > 30);
                assert.isTrue(result[0].gameplayCompletionist > 80);
            });
        });
        it('should abort searching for dark souls III', () => {
            const abortController = new AbortController();
            abortController.abort();
            return new howlongtobeat_1.HowLongToBeatService().search('dark souls III', abortController.signal).then(() => {
                assert.fail();
            }).catch(e => {
                assert.include(e.message.toLowerCase(), 'cancel');
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
                // console.log(result);
                assert.isNotNull(result);
                assert.isTrue(result.length > 1);
                assert.strictEqual(result[0].gameplayMain, 0);
            });
        });
    });
});
//# sourceMappingURL=howlongtobeat.integration.test.js.map