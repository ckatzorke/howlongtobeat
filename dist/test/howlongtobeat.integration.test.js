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
                assert.strictEqual(entry.platforms.length, 3);
                // backward compatible test
                assert.strictEqual(entry.playableOn.length, 3);
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
        it('should have 1 search results with 100% similarity when searching for Persona 4 Golden', () => {
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
                assert.strictEqual(result[0].timeLabels.length, 0);
            });
        });
        it('Entries with Solo and Vs. playstyles should have only them (e.g. Guns of Icarus Online)', () => {
            return new howlongtobeat_1.HowLongToBeatService().search('Guns of Icarus Online').then((result) => {
                // console.log(result);
                assert.isNotNull(result);
                assert.isTrue(result.length >= 1);
                assert.strictEqual(result[0].gameplayMain, 0);
                assert.strictEqual(result[0].timeLabels.length, 2);
                assert.isTrue(result[0].gameplayMainExtra >= 8);
                assert.isTrue(result[0].gameplayCompletionist >= 17);
                assert.deepEqual(result[0].timeLabels[0], ['gameplayMainExtra', 'Co-Op']);
                assert.deepEqual(result[0].timeLabels[1], ['gameplayCompletionist', 'Vs.']);
            });
        });
    });
    describe('Test for searchWithOptions()', () => {
        it('should have no results when searching for Tomb Raider in 1995', () => {
            return new howlongtobeat_1.HowLongToBeatService().searchWithOptions('dorks', { year: 1995 }).then((result) => {
                assert.isNotNull(result);
                assert.strictEqual(result.length, 0);
            });
        });
        it('should return exactly one result for Tomb Raider in 1996', () => {
            return new howlongtobeat_1.HowLongToBeatService().searchWithOptions('Tomb Raider', { year: 1996 }).then((result) => {
                assert.isNotNull(result);
                assert.strictEqual(result.length, 1);
                assert.strictEqual(result[0].id, '10468');
                assert.strictEqual(result[0].name, 'Tomb Raider');
            });
        });
        it('should return exactly 18 results for Tomb Raider from 2012 to 2018', () => {
            return new howlongtobeat_1.HowLongToBeatService().searchWithOptions('Tomb Raider', { minYear: 2012, maxYear: 2018 }).then((result) => {
                assert.isNotNull(result);
                assert.strictEqual(result.length, 18);
            });
        });
        it('should have at least 3 search results when searching for dark souls III', () => {
            return new howlongtobeat_1.HowLongToBeatService().searchWithOptions('Dark Souls III').then((result) => {
                assert.isNotNull(result);
                assert.isTrue(result.length >= 3);
                assert.strictEqual(result[0].id, '26803');
                assert.strictEqual(result[0].name, 'Dark Souls III');
            });
        });
    });
});
//# sourceMappingURL=howlongtobeat.integration.test.js.map