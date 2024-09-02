const cheerio = require('cheerio');
const levenshtein = require('fast-levenshtein');

import { time } from 'console';
import { HltbSearch, SearchOptions } from './hltbsearch';


export class HowLongToBeatService {
  private hltb: HltbSearch = new HltbSearch();

  constructor() { }

  /**
   * Get HowLongToBeatEntry from game id, by fetching the detail page like https://howlongtobeat.com/game.php?id=6974 and parsing it.
   * @param gameId the hltb internal gameid
   * @return Promise<HowLongToBeatEntry> the promise that, when fullfilled, returns the game
   */
  async detail(gameId: string, signal?: AbortSignal): Promise<HowLongToBeatEntry> {
    let detailPage = await this.hltb.detailHtml(
      gameId,
      signal
    );
    let entry = HowLongToBeatParser.parseDetails(detailPage, gameId);
    return entry;
  }

  async search(query: string, signal?: AbortSignal): Promise<Array<HowLongToBeatEntry>> {
    return this.searchWithOptions(query, null, signal);
  }

  async searchWithOptions(query: string, searchOptions?: SearchOptions, signal?: AbortSignal): Promise<Array<HowLongToBeatEntry>> {
    let searchTerms = query.split(' ');
    let search = await this.hltb.searchWithOptions(
      searchTerms,
      searchOptions,
      signal
    );
    // console.log(`Found ${search.count} results`);
    let hltbEntries = new Array<HowLongToBeatEntry>();
    for (const resultEntry of search.data) {
      let gameplayMain = 0,
          gameplayMainExtra = 0,
          gameplayCompletionist = 0;

      let timeLabels: Map<'gameplayMain' | 'gameplayMainExtra' | 'gameplayCompletionist',string> = new Map();

      let {
        comp_lvl_sp,
        comp_lvl_co,
        comp_lvl_mp,
        comp_lvl_combine,
        comp_main,
        comp_100,
        comp_all,
        comp_plus,
        invested_co,
        invested_mp
      } = resultEntry;

      if (comp_lvl_sp === 1) {
        if (comp_lvl_combine === 1) {
          timeLabels.set('gameplayMain', 'Solo')
          gameplayMain = comp_all;
        } else {
          timeLabels.set('gameplayMain', 'Main Story');
          gameplayMain = comp_main;
          timeLabels.set('gameplayMainExtra', 'Main + Extra');
          gameplayMainExtra = comp_plus;
          timeLabels.set('gameplayCompletionist', 'Completionist');
          gameplayCompletionist = comp_100;
        }
      }

      if ((comp_lvl_sp === 0 || comp_lvl_combine === 1) && (comp_lvl_co === 1 || comp_lvl_mp === 1)) {
        if (comp_lvl_co === 1) {
          timeLabels.set('gameplayMainExtra', 'Co-Op');
          gameplayMainExtra = invested_co;
        }
        if (comp_lvl_mp === 1) {
          timeLabels.set('gameplayCompletionist', 'Vs.');
          gameplayCompletionist = invested_mp;
        }
      }

      hltbEntries.push(new HowLongToBeatEntry(
        '' + resultEntry.game_id, // game id is now a number, but I want to keep the model stable
        resultEntry.game_name,
        '', // no description
        resultEntry.profile_platform ? resultEntry.profile_platform.split(', ') : [],
        HltbSearch.IMAGE_URL + resultEntry.game_image,
        [...timeLabels.entries()],
        Math.round(gameplayMain / 3600),
        Math.round(gameplayMainExtra / 3600),
        Math.round(gameplayCompletionist / 3600),
        HowLongToBeatService.calcDistancePercentage(resultEntry.game_name, query),
        query
      ));
    }
    return hltbEntries;
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
    if (longer.length < shorter.length) {
      // longer should always have
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
    return Math.round(((longerLength - distance) / longerLength) * 100) / 100;
  }
}

/**
 * Encapsulates a game detail
 */
export class HowLongToBeatEntry {
  /* deprecated, since it was also renamed on the website, and platforms is much more suitable */
  public readonly playableOn: string[];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    /* replaces playableOn */
    public readonly platforms: string[],
    public readonly imageUrl: string,
    public readonly timeLabels: Array<['gameplayMain' | 'gameplayMainExtra' | 'gameplayCompletionist', string]>,
    public readonly gameplayMain: number,
    public readonly gameplayMainExtra: number,
    public readonly gameplayCompletionist: number,
    public readonly similarity: number,
    public readonly searchTerm: string
  ) {
    this.playableOn = platforms;
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
    let timeLabels: Array<['gameplayMain' | 'gameplayMainExtra' | 'gameplayCompletionist', string]> = new Array();
    let gameplayMain = 0;
    let gameplayMainExtra = 0;
    let gameplayCompletionist = 0;

    gameName = $('div[class*=GameHeader_profile_header__]')[0].children[0].data.trim();
    imageUrl = $('div[class*=GameHeader_game_image__]')[0].children[0].attribs.src;

    let liElements = $('div[class*=GameStats_game_times__] li');
    const gameDescription = $(
      '.in.back_primary.shadow_box div[class*=GameSummary_large__]'
    ).text();

    let platforms = [];
    $('div[class*=GameSummary_profile_info__]').each(function () {
      const metaData = $(this).text();
      if (metaData.includes('Platforms:')) {
        platforms = metaData
          .replace(/\n/g, '')
          .replace('Platforms:', '')
          .split(',')
          .map(data => data.trim());
        return;
      }
    });
    // be backward compatible
    let playableOn = platforms;

    liElements.each(function () {
      let type: string = $(this)
        .find('h4')
        .text();
      let time: number = HowLongToBeatParser.parseTime(
        $(this)
          .find('h5')
          .text()
      );
      if (
        type.startsWith('Main Story') ||
        type.startsWith('Single-Player') ||
        type.startsWith('Solo')
      ) {
        gameplayMain = time;
        timeLabels.push(['gameplayMain', type]);
      } else if (type.startsWith('Main + Sides') || type.startsWith('Co-Op')) {
        gameplayMainExtra = time;
        timeLabels.push(['gameplayMainExtra', type]);
      } else if (type.startsWith('Completionist') || type.startsWith('Vs.')) {
        gameplayCompletionist = time;
        timeLabels.push(['gameplayCompletionist', type]);
      }
    });

    return new HowLongToBeatEntry(
      id,
      gameName,
      gameDescription,
      platforms,
      imageUrl,
      timeLabels,
      gameplayMain,
      gameplayMainExtra,
      gameplayCompletionist,
      1,
      gameName
    );
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
    let d: number =
      (HowLongToBeatParser.getTime(range[0]) +
        HowLongToBeatParser.getTime(range[1])) /
      2;
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
    const timeUnit = text.substring(text.indexOf(' ') + 1).trim();
    if (timeUnit === 'Mins') {
      return 1;
    }
    let time: string = text.substring(0, text.indexOf(' '));
    if (time.indexOf('½') > -1) {
      return 0.5 + parseInt(time.substring(0, text.indexOf('½')));
    }
    return parseInt(time);
  }


}
