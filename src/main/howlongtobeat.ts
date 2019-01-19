const cheerio = require('cheerio');
const levenshtein = require('fast-levenshtein');

import { HtmlScraper } from './htmlscraper';

export class HowLongToBeatService {

  private scraper: HtmlScraper = new HtmlScraper();
  public static BASE_URL: string = 'https://howlongtobeat.com/';
  public static DETAIL_URL: string = `${HowLongToBeatService.BASE_URL}game.php?id=`;
  public static SEARCH_URL: string = `${HowLongToBeatService.BASE_URL}search_results.php`;

  constructor() {

  }

  /**
   * Get HowLongToBeatEntry from game id, by fetching the detail page like https://howlongtobeat.com/game.php?id=6974 and parsing it.
   * @param gameId the hltb internal gameid
   * @return Promise<HowLongToBeatEntry> the promise that, when fullfilled, returns the game
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
  constructor(public readonly id: string, public readonly name: string, public readonly imageUrl: string, public readonly timeLabels: Array<string[]>, public readonly gameplayMain: number, public readonly gameplayMainExtra: number, public readonly gameplayCompletionist: number, public readonly similarity: number) {
  }
}

/**
 * Internal helper class to parse html and create a HowLongToBeatEntry
 */
export class HowLongToBeatParser {

  /**
   * Parses the passed html to generate a HowLongToBeatyEntrys.
   * All the dirty DOM parsing and element traversing is done here.
   * @param html the html as basis for the parsing. taking directly from the response of the hltb detail page
   * @param id the hltb internal id
   * @return HowLongToBeatEntry representing the page
   */
  static parseDetails(html: string, id: string): HowLongToBeatEntry {
    const $ = cheerio.load(html);
    let gameName = '';
    let imageUrl = '';
    let timeLabels: Array<string[]> = new Array<string[]>();
    let gameplayMain = 0;
    let gameplayMainExtra = 0;
    let gameplayComplete = 0;

    gameName = $('.profile_header')[0].children[0].data.trim();
    imageUrl = $('.game_image img')[0].attribs.src;

    let liElements = $('.game_times li');
    liElements.each(function() {
      let type: string = $(this).find('h5').text();
      let time: number = HowLongToBeatParser.parseTime($(this).find('div').text());
      if (type.startsWith('Main Story') || type.startsWith('Single-Player') || type.startsWith('Solo')) {
        gameplayMain = time;
        timeLabels.push(['gameplayMain', type]);
      } else if (type.startsWith('Main + Extra') || type.startsWith('Co-Op')) {
        gameplayMainExtra = time;
        timeLabels.push(['gameplayMainExtra', type]);
      } else if (type.startsWith('Completionist')  || type.startsWith('Vs.')) {
        gameplayComplete = time;
        timeLabels.push(['gameplayComplete', type]);
      }
    });

    return new HowLongToBeatEntry(id, gameName, imageUrl, timeLabels, gameplayMain, gameplayMainExtra, gameplayComplete, 1);
  }

  /**
   * Parses the passed html to generate an Array of HowLongToBeatyEntrys.
   * All the dirty DOM parsing and element traversing is done here.
   * @param html the html as basis for the parsing. taking directly from the response of the hltb search
   * @param searchTerm the query what was searched, only used to calculate the similarity
   * @return an Array<HowLongToBeatEntry>s
   */
  static parseSearch(html: string, searchTerm: string): Array<HowLongToBeatEntry> {
    let results: Array<HowLongToBeatEntry> = new Array<HowLongToBeatEntry>();
    const $ = cheerio.load(html);

    //check for result page
    if ($('h3').length > 0) {
      let liElements = $('li');
      liElements.each(function() {
        let gameTitleAnchor = $(this).find('a')[0];
        let gameName: string = gameTitleAnchor.attribs.title;
        let detailId: string = gameTitleAnchor.attribs.href.substring(gameTitleAnchor.attribs.href.indexOf('?id=') + 4);
        let gameImage: string = $(gameTitleAnchor).find('img')[0].attribs.src;
        //entry.setPropability(calculateSearchHitPropability(entry.getName(), searchTerm));
        let timeLabels: Array<string[]> = new Array<string[]>();
        let main: number = 0;
        let mainExtra: number = 0;
        let complete: number = 0;
        try {
          $(this).find('.search_list_details_block div.shadow_text').each(function() {
            let type: string = $(this).text();
            if (type.startsWith('Main Story') || type.startsWith('Single-Player') || type.startsWith('Solo')) {
              let time: number = HowLongToBeatParser.parseTime($(this).next().text());
              main = time;
              timeLabels.push(['gameplayMain', type]);
            } else if (type.startsWith('Main + Extra') || type.startsWith('Co-Op')) {
              let time: number = HowLongToBeatParser.parseTime($(this).next().text());
              mainExtra = time;
              timeLabels.push(['gameplayMainExtra', type]);
            } else if (type.startsWith('Completionist') || type.startsWith('Vs.')) {
              let time: number = HowLongToBeatParser.parseTime($(this).next().text());
              complete = time;
              timeLabels.push(['gameplayCompletionist', type]);
            }            
          });          
        } catch (e) {
          console.error(e);
        }
        let entry = new HowLongToBeatEntry(detailId, gameName, gameImage, timeLabels, main, mainExtra, complete, HowLongToBeatParser.calcDistancePercentage(gameName, searchTerm));
        results.push(entry);
      });
    }

    return results;
  }

  /**
   * Use this method to distinguish time descriptions for Online
   * from Story mode games.
   * 
   * Online Game: Solo, Co-Op & Vs.
   * Story Game: Main Story, Main + Extra, Completionist
   * 
   * @param times html snippet that contains the times
   * 
   * @return true if is an online game, false for a story game
   */
  private static isOnlineGameTimeData(element: any): boolean {
    if (element.find('.search_list_tidbit_short').length > 0) {
      return true;
    }

    return false;
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
    // '65&#189; Hours/Mins'; '--' if not known
    if (text.startsWith('--')) {
      return 0;
    }
    if (text.indexOf(' - ') > -1) {
      return HowLongToBeatParser.handleRange(text);
    }
    return HowLongToBeatParser.getTime(text);
  }

  /**
   * Parses a range of numbers and creates the average.
	 * @param text
	 *            like '5 Hours - 12 Hours' or '2½ Hours - 33½ Hours'
	 * @return the arithmetic median of the range
	 */
  private static handleRange(text: string): number {
    let range: Array<string> = text.split(' - ');
    let d: number = (HowLongToBeatParser.getTime(range[0]) + HowLongToBeatParser.getTime(range[1])) / 2;
    return d;
  }

	/**
   * Parses a string to get a number
	 * @param text,
	 *            can be '12 Hours' or '5½ Hours' or '50 Mins'
	 * @return the ttime, parsed from text
	 */
  private static getTime(text: string): number {
    //check for Mins, then assume 1 hour at least
    const timeUnit = text.substring(text.indexOf(" ") + 1).trim();
    if (timeUnit === 'Mins') {
      return 1;
    }
    let time: string = text.substring(0, text.indexOf(" "));
    if (time.indexOf('½') > -1) {
      return 0.5 + parseInt(time.substring(0, text.indexOf('½')));

    }
    return parseInt(time);
  }

  /**
   * Calculates the similarty of two strings based on the levenshtein distance in relation to the string lengths.
   * It is used to see how similar the search term is to the game name. This, of course has only relevance if the search term is really specific and matches the game name as good as possible.
   * When using a proper search index, this would be the ranking/rating and much more sophisticated than this helper.
   * @param text the text to compare to
   * @param term the string of which the similarity is wanted 
   */
  static calcDistancePercentage(text: string, term: string): number {
    let longer: string = text.toLowerCase().trim();
    let shorter: string = term.toLowerCase().trim();
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
