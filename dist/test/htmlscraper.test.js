"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const htmlscraper_1 = require("../main/htmlscraper");
chai.use(chaiAsPromised);
const expect = chai.expect;
const assert = chai.assert;
describe('Testing HtmlScraper', () => {
    describe('Test for illegal urls', () => {
        it('should throw an error', () => {
            return assert.isRejected(new htmlscraper_1.HtmlScraper().detailHtml('bla'), Error);
        });
    });
});
//# sourceMappingURL=htmlscraper.test.js.map