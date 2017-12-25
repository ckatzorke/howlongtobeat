import * as mocha from 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { HtmlScraper } from '../main/htmlscraper';

chai.use(chaiAsPromised);
const expect = chai.expect;
const assert = chai.assert;

describe('Testing HtmlScraper', () => {

  describe('Test for illegal urls', () => {
    it('should throw an error', () => {
      return assert.isRejected(new HtmlScraper().detailHtml('bla'), Error);
    });
  });

});
