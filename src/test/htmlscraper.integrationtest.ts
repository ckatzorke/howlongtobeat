import * as mocha from 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { HtmlScraper } from '../main/htmlscraper';

chai.use(chaiAsPromised);
const expect = chai.expect;
const assert = chai.assert;

describe(' Integration-Testing HtmlScraper', () => {

  

  describe('Test for gameId (Dark Souls)', () => {
    it('should return the markup source for https://howlongtobeat.com/game.php?id=2224', () => {
      return expect((new HtmlScraper().detailHtml('https://howlongtobeat.com/game.php?id=2224'))).to.be.fulfilled;
    });
  });


});
