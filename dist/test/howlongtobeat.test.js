"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const fs = require("fs");
const howlongtobeat_1 = require("../main/howlongtobeat");
const expect = chai.expect;
const assert = chai.assert;
describe('Testing HowLongToBeatParser', () => {
    describe('Test for calcDistancePercentage()', () => {
        it('dark souls and dark souls should have 100% similarity', () => {
            let perc = howlongtobeat_1.HowLongToBeatService.calcDistancePercentage('Dark Souls', 'Dark Souls');
            assert.strictEqual(perc, 1);
        });
        it('dark souls and dark soul should have 90% similarity', () => {
            let perc = howlongtobeat_1.HowLongToBeatService.calcDistancePercentage('Dark Souls', 'Dark Soul');
            assert.strictEqual(perc, 0.9);
        });
    });
    describe('Test for parseDetail, if this succeeds, but live installment fails, howlongtobeat.com may have changed their html', () => {
        it('should parse the details page  (static, from id=3978 - God of War 3)', () => {
            let html = fs.readFileSync('src/test/resources/detail_gow3.html', 'utf-8');
            let detail = howlongtobeat_1.HowLongToBeatParser.parseDetails(html, '3978');
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
            const html = fs.readFileSync('src/test/resources/detail_street_fighter.html', 'utf-8');
            const detail = howlongtobeat_1.HowLongToBeatParser.parseDetails(html, '9224');
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
    describe('Test for parsing minutes correctly from detail page. Example is Guns of Icarus Online which does not have Co-Op time but it has Vs.', () => {
        it('should parse the Co-Op and Vs. time correctly  (static, from id=4216 - Street Fighter, takes 0 Minutes and 20.5 for Vs.)', () => {
            const html = fs.readFileSync('src/test/resources/detail_guns_of_icarus_online.html', 'utf-8');
            const detail = howlongtobeat_1.HowLongToBeatParser.parseDetails(html, '4216');
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
});
//# sourceMappingURL=howlongtobeat.test.js.map