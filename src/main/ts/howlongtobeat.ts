const select = require('soupselect').select;
const htmlparser = require('htmlparser');
const levenshtein = require('fast-levenshtein');

import { HtmlScraper } from './htmlscraper';

export class HowLongToBeatService {

  private scraper: HtmlScraper = new HtmlScraper();
  public static BASE_URL: string = 'https://howlongtobeat.com/';
  public static DETAIL_URL: string = `${HowLongToBeatService.BASE_URL}game.php?id=`;
  public static SEARCH_URL: string = `${HowLongToBeatService.BASE_URL}search_main.php`;

  constructor() {

  }

  /**
   * Get HowLongToBeatEntry from game id
   * @param gameId 
   */
  async detail(gameId: string): Promise<HowLongToBeatEntry> {
    let detailPage = await this.scraper.detailHtml(`${HowLongToBeatService.DETAIL_URL}${gameId}`);
    let entry = HowLongToBeatParser.parseDetails(detailPage, gameId);
    return entry;
  }

  async search(query: string): Promise<Array<HowLongToBeatEntry>> {
    let searchPage = await this.scraper.search(query, HowLongToBeatService.SEARCH_URL);
    let result = HowLongToBeatParser.parseSearch(searchPage, query);
    return result;
  }
}

/**
 * Encapsulates a game detail
 */
export class HowLongToBeatEntry {
  constructor(public readonly id: string, public readonly name: string, public readonly imageUrl: string, public readonly gameplayMain: number, public readonly gameplayCompletionist: number, public readonly similarity: number) {
  }
}

/**
 * Internal helper class to parse html and create a HowLongToBeatEntry
 */
export class HowLongToBeatParser {

  static parseDetails(html: string, id: string): HowLongToBeatEntry {
    let gameName = '';
    let imageUrl = '';
    let gameplayMain = 0;
    let gameplayComplete = 0;
    let handler = new htmlparser.DefaultHandler((err, dom) => {
      if (err) {
        //Error handling!
        console.error(err);
      } else {
        gameName = select(dom, '.profile_header')[0].children[0].raw.trim();
        imageUrl = HowLongToBeatService.BASE_URL + select(dom, '.game_image img')[0].attribs.src;
        let liElements = select(dom, '.game_times li');
        liElements.forEach((li) => {
          let type: string = select(li, 'h5')[0].children[0].raw;
          let time: number = HowLongToBeatParser.parseTime(select(li, 'div')[0].children[0].raw);
          if (type.startsWith('Main Story') || type.startsWith('Single-Player') || type.startsWith('Solo')) {
            gameplayMain = time;
          } else if (type.startsWith('Completionist')) {
            gameplayComplete = time;
          }
        });
      }
    });
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(html);

    return new HowLongToBeatEntry(id, gameName, imageUrl, gameplayMain, gameplayComplete, 1);
  }

  static parseSearch(html: string, searchTerm:string): Array<HowLongToBeatEntry> {
    //console.log('html', html);
    let results: Array<HowLongToBeatEntry> = new Array<HowLongToBeatEntry>();
    let handler = new htmlparser.DefaultHandler((err, dom) => {
      if (err) {
        //Error handling!
        console.error(err);
      } else {
        //check for result page
        if (select(dom, 'h3').length > 0) {
          let liElements = select(dom, 'li');
          liElements.forEach((li) => {
            let gameTitleAnchor = select(li, 'a')[0];
            let gameName: string = gameTitleAnchor.attribs.title;
            let detailId: string = gameTitleAnchor.attribs.href.substring(gameTitleAnchor.attribs.href.indexOf('?id=') + 4);
            let gameImage: string = HowLongToBeatService.BASE_URL + select(gameTitleAnchor, 'img')[0].attribs.src;
            //entry.setPropability(calculateSearchHitPropability(entry.getName(), searchTerm));
            let main: number;
            let complete: number;
            
            let times = select(li, ".search_list_details_block")[0];
            times
              .children
              .forEach((div) => {
                if (div.type === 'tag') {
                  let type: string = div.children[1].children[0].raw.trim();
                  let time: number = HowLongToBeatParser.parseTime(div.children[3].children[0].raw.trim());
                  if (type.startsWith('Main Story') || type.startsWith('Single-Player') || type.startsWith('Solo')) {
                    main = time;
                  } else if (type.startsWith('Completionist')) {
                    complete = time;
                  }
                }
              });
            results.push(new HowLongToBeatEntry(detailId, gameName, gameImage, main, complete, HowLongToBeatParser.calcDistancePercentage(gameName, searchTerm)));
          });
        } else {
          results;
        }
      }
    });
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(html);

    return results;
  }

  /**
	 * Utility method used for parsing a given input text (like
	 * &quot;44&#189;&quot;) as double (like &quot;44.5&quot;). The input text
	 * represents the amount of hours needed to play this game.
	 * 
	 * @param text
	 *            representing the hours
	 * @return the pares time as double
	 */
  private static parseTime(text: string): number {
    // '65&#189; Hours'; '--' if not known
    if (text === '--') {
      return 0;
    }
    if (text.indexOf(' - ') > -1) {
      return HowLongToBeatParser.handleRange(text);
    }
    return HowLongToBeatParser.getTime(text);
  }

  /**
	 * @param text
	 *            like '5 Hours - 12 Hours' or '2½ Hours - 33½ Hours'
	 * @return
	 */
  private static handleRange(text: string): number {
    let range: Array<string> = text.split(' - ');
    let d: number = (HowLongToBeatParser.getTime(range[0]) + HowLongToBeatParser.getTime(range[1])) / 2;
    return d;
  }

	/**
	 * @param text,
	 *            can be '12 Hours' or '5½ Hours'
	 * @return
	 */
  private static getTime(text: string): number {
    let time: string = text.substring(0, text.indexOf(" "));
    if (time.indexOf('&#189;') > -1) {
      return 0.5 + parseInt(time.substring(0, text.indexOf('&#189;')));

    }
    return parseInt(time);
  }

  static calcDistancePercentage(text: string, term: string): number {
    let longer: string = text.toLowerCase();
    let shorter: string = term.toLowerCase();
    if (longer.length < shorter.length) { // longer should always have
      // greater length
      let temp: string = longer;
      longer = shorter;
      shorter = temp;
    }
    let longerLength: number = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    let distance = levenshtein.get(longer, shorter);
    return Math.round((longerLength - distance) / longerLength * 100) / 100;
  }
}
