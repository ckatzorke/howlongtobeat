const cheerio = require('cheerio');
const levenshtein = require('fast-levenshtein');

import { HltbSearch } from './hltbsearch';

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
    let searchTerms = query.split(' ');
    let search = await this.hltb.search(
      searchTerms,
      signal
    );
    // console.log(`Found ${search.count} results`);
    let hltbEntries = new Array<HowLongToBeatEntry>();
    for (const resultEntry of (search && search.data) || []) {
      hltbEntries.push(new HowLongToBeatEntry(
        '' + resultEntry.game_id, // game id is now a number, but I want to keep the model stable
        resultEntry.game_name,
        '', // no description
        HowLongToBeatParser.splitPlatforms(resultEntry.profile_platform),
        HltbSearch.IMAGE_URL + resultEntry.game_image,
        [["Main", "Main"] , ["Main + Extra", "Main + Extra"], ["Completionist", "Completionist"]],
        HowLongToBeatParser.secondsToHours(resultEntry.comp_main),
        HowLongToBeatParser.secondsToHours(resultEntry.comp_plus),
        HowLongToBeatParser.secondsToHours(resultEntry.comp_100),
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
    public readonly timeLabels: Array<string[]>,
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
    // the current site (Next.js) ships all game data as JSON in __NEXT_DATA__
    const game = HowLongToBeatParser.extractNextDataGame(html);
    if (game) {
      return HowLongToBeatParser.parseNextDataGame(game, id);
    }
    // older markup, kept as a fallback
    return HowLongToBeatParser.parseLegacyDetails(html, id);
  }

  /**
   * Finds the game object inside the page's __NEXT_DATA__ JSON, or null when the page has none.
   */
  static extractNextDataGame(html: string): any {
    const $ = cheerio.load(html);
    const raw = $('script#__NEXT_DATA__').html();
    if (!raw) {
      return null;
    }
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    const game = data && data.props && data.props.pageProps && data.props.pageProps.game;
    const list = game && game.data && game.data.game;
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }

  /**
   * Builds the entry from the JSON game object. Times are in seconds there.
   * Games without single-player times (multiplayer only) report Co-Op and Vs. instead,
   * mapped like the old page did: Co-Op -> gameplayMainExtra, Vs. -> gameplayCompletionist.
   */
  static parseNextDataGame(game: any, id: string): HowLongToBeatEntry {
    const gameName: string = (game.game_name || '').trim();
    const imageUrl: string = game.game_image ? HltbSearch.IMAGE_URL + game.game_image : '';
    const description: string = HowLongToBeatParser.stripHtml(game.profile_summary || '');
    const platforms = HowLongToBeatParser.splitPlatforms(game.profile_platform);

    const timeLabels: Array<string[]> = new Array<string[]>();
    let gameplayMain = 0;
    let gameplayMainExtra = 0;
    let gameplayComplete = 0;

    // The site decides which rows it shows from the comp_lvl_* flags, not from the times:
    // a multiplayer game can carry a stray comp_main that the page never displays.
    const hasFlags = game.comp_lvl_sp !== undefined && game.comp_lvl_sp !== null;
    const singlePlayer = hasFlags
      ? Number(game.comp_lvl_sp) === 1
      : (game.comp_main || 0) > 0 || (game.comp_plus || 0) > 0 || (game.comp_100 || 0) > 0;
    const coOp = hasFlags ? Number(game.comp_lvl_co) === 1 : (game.invested_co || 0) > 0;
    const versus = hasFlags ? Number(game.comp_lvl_mp) === 1 : (game.invested_mp || 0) > 0;

    if (singlePlayer) {
      gameplayMain = HowLongToBeatParser.secondsToHours(game.comp_main);
      gameplayMainExtra = HowLongToBeatParser.secondsToHours(game.comp_plus);
      gameplayComplete = HowLongToBeatParser.secondsToHours(game.comp_100);
      timeLabels.push(['gameplayMain', 'Main Story']);
      timeLabels.push(['gameplayMainExtra', 'Main + Sides']);
      timeLabels.push(['gameplayComplete', 'Completionist']);
    } else {
      if (coOp) {
        gameplayMainExtra = HowLongToBeatParser.secondsToHours(game.invested_co);
        timeLabels.push(['gameplayMainExtra', 'Co-Op']);
      }
      if (versus) {
        gameplayComplete = HowLongToBeatParser.secondsToHours(game.invested_mp);
        timeLabels.push(['gameplayComplete', 'Vs.']);
      }
    }

    return new HowLongToBeatEntry(
      id,
      gameName,
      description,
      platforms,
      imageUrl,
      timeLabels,
      gameplayMain,
      gameplayMainExtra,
      gameplayComplete,
      1,
      gameName
    );
  }

  /**
   * Seconds to hours, rounded to the nearest half hour (like the site shows them).
   * Anything under an hour counts as 1 hour, as the old parser did for times shown in "Mins".
   */
  static secondsToHours(seconds: number): number {
    if (!seconds || seconds <= 0) {
      return 0;
    }
    if (seconds < 3600) {
      return 1;
    }
    return Math.round(seconds / 1800) / 2;
  }

  static splitPlatforms(platforms: string): string[] {
    return platforms ? platforms.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];
  }

  private static stripHtml(text: string): string {
    return cheerio.load(`<div>${text}</div>`)('div').text().trim();
  }

  /**
   * Parses the old detail page markup (before the site moved its data into __NEXT_DATA__).
   */
  static parseLegacyDetails(html: string, id: string): HowLongToBeatEntry {
    const $ = cheerio.load(html);
    let gameName = '';
    let imageUrl = '';
    let timeLabels: Array<string[]> = new Array<string[]>();
    let gameplayMain = 0;
    let gameplayMainExtra = 0;
    let gameplayComplete = 0;

    const header = $('div[class*=GameHeader_profile_header__]')[0];
    if (!header) {
      throw new Error(`Could not parse the detail page of game ${id}: howlongtobeat.com may have changed its markup`);
    }
    gameName = header.children[0].data.trim();
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
        gameplayComplete = time;
        timeLabels.push(['gameplayComplete', type]);
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
      gameplayComplete,
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
