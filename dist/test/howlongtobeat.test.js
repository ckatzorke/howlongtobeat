"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const howlongtobeat_1 = require("../main/howlongtobeat");
const expect = chai.expect;
const assert = chai.assert;
describe('Testing HowLongToBeatParser', () => {
    describe('Test for calcDistancePercentage()', () => {
        it('dark souls and dark souls should have 100% similarity', () => {
            let perc = howlongtobeat_1.HowLongToBeatParser.calcDistancePercentage('Dark Souls', 'Dark Souls');
            assert.strictEqual(perc, 1);
        });
        it('dark souls and dark soul should have 90% similarity', () => {
            let perc = howlongtobeat_1.HowLongToBeatParser.calcDistancePercentage('Dark Souls', 'Dark Soul');
            assert.strictEqual(perc, .9);
        });
    });
});
