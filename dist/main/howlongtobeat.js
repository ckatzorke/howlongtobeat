"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio = require('cheerio');
const levenshtein = require('fast-levenshtein');
const htmlscraper_1 = require("./htmlscraper");
class HowLongToBeatService {
    constructor() {
        this.scraper = new htmlscraper_1.HtmlScraper();
    }
    /**
     * Get HowLongToBeatEntry from game id, by fetching the detail page like https://howlongtobeat.com/game.php?id=6974 and parsing it.
     * @param gameId the hltb internal gameid
     * @return Promise<HowLongToBeatEntry> the promise that, when fullfilled, returns the game
     */
    detail(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            let detailPage = yield this.scraper.detailHtml(`${HowLongToBeatService.DETAIL_URL}${gameId}`);
            let entry = HowLongToBeatParser.parseDetails(detailPage, gameId);
            return entry;
        });
    }
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchPage = yield this.scraper.search(query, HowLongToBeatService.SEARCH_URL);
            let result = HowLongToBeatParser.parseSearch(searchPage, query);
            return result;
        });
    }
}
HowLongToBeatService.BASE_URL = 'https://howlongtobeat.com/';
HowLongToBeatService.DETAIL_URL = `${HowLongToBeatService.BASE_URL}game.php?id=`;
HowLongToBeatService.SEARCH_URL = `${HowLongToBeatService.BASE_URL}search_results.php`;
exports.HowLongToBeatService = HowLongToBeatService;
/**
 * Encapsulates a game detail
 */
class HowLongToBeatEntry {
    constructor(id, name, imageUrl, timeLabels, gameplayMain, gameplayMainExtra, gameplayCompletionist, similarity) {
        this.id = id;
        this.name = name;
        this.imageUrl = imageUrl;
        this.timeLabels = timeLabels;
        this.gameplayMain = gameplayMain;
        this.gameplayMainExtra = gameplayMainExtra;
        this.gameplayCompletionist = gameplayCompletionist;
        this.similarity = similarity;
    }
}
exports.HowLongToBeatEntry = HowLongToBeatEntry;
/**
 * Internal helper class to parse html and create a HowLongToBeatEntry
 */
class HowLongToBeatParser {
    /**
     * Parses the passed html to generate a HowLongToBeatyEntrys.
     * All the dirty DOM parsing and element traversing is done here.
     * @param html the html as basis for the parsing. taking directly from the response of the hltb detail page
     * @param id the hltb internal id
     * @return HowLongToBeatEntry representing the page
     */
    static parseDetails(html, id) {
        const $ = cheerio.load(html);
        let gameName = '';
        let imageUrl = '';
        let timeLabels = new Array();
        let gameplayMain = 0;
        let gameplayMainExtra = 0;
        let gameplayComplete = 0;
        gameName = $('.profile_header')[0].children[0].data.trim();
        imageUrl = $('.game_image img')[0].attribs.src;
        let liElements = $('.game_times li');
        liElements.each(function () {
            let type = $(this).find('h5').text();
            let time = HowLongToBeatParser.parseTime($(this).find('div').text());
            if (type.startsWith('Main Story') || type.startsWith('Single-Player') || type.startsWith('Solo')) {
                gameplayMain = time;
                timeLabels.push(['gameplayMain', type]);
            }
            else if (type.startsWith('Main + Extra') || type.startsWith('Co-Op')) {
                gameplayMainExtra = time;
                timeLabels.push(['gameplayMainExtra', type]);
            }
            else if (type.startsWith('Completionist') || type.startsWith('Vs.')) {
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
    static parseSearch(html, searchTerm) {
        let results = new Array();
        const $ = cheerio.load(html);
        //check for result page
        if ($('h3').length > 0) {
            let liElements = $('li');
            liElements.each(function () {
                let gameTitleAnchor = $(this).find('a')[0];
                let gameName = gameTitleAnchor.attribs.title;
                let detailId = gameTitleAnchor.attribs.href.substring(gameTitleAnchor.attribs.href.indexOf('?id=') + 4);
                let gameImage = $(gameTitleAnchor).find('img')[0].attribs.src;
                //entry.setPropability(calculateSearchHitPropability(entry.getName(), searchTerm));
                let timeLabels = new Array();
                let main = 0;
                let mainExtra = 0;
                let complete = 0;
                try {
                    $(this).find('.search_list_details_block div.shadow_text').each(function () {
                        let type = $(this).text();
                        if (type.startsWith('Main Story') || type.startsWith('Single-Player') || type.startsWith('Solo')) {
                            let time = HowLongToBeatParser.parseTime($(this).next().text());
                            main = time;
                            timeLabels.push(['gameplayMain', type]);
                        }
                        else if (type.startsWith('Main + Extra') || type.startsWith('Co-Op')) {
                            let time = HowLongToBeatParser.parseTime($(this).next().text());
                            mainExtra = time;
                            timeLabels.push(['gameplayMainExtra', type]);
                        }
                        else if (type.startsWith('Completionist') || type.startsWith('Vs.')) {
                            let time = HowLongToBeatParser.parseTime($(this).next().text());
                            complete = time;
                            timeLabels.push(['gameplayCompletionist', type]);
                        }
                    });
                }
                catch (e) {
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
    static isOnlineGameTimeData(element) {
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
    static parseTime(text) {
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
    static handleRange(text) {
        let range = text.split(' - ');
        let d = (HowLongToBeatParser.getTime(range[0]) + HowLongToBeatParser.getTime(range[1])) / 2;
        return d;
    }
    /**
   * Parses a string to get a number
     * @param text,
     *            can be '12 Hours' or '5½ Hours' or '50 Mins'
     * @return the ttime, parsed from text
     */
    static getTime(text) {
        //check for Mins, then assume 1 hour at least
        const timeUnit = text.substring(text.indexOf(" ") + 1).trim();
        if (timeUnit === 'Mins') {
            return 1;
        }
        let time = text.substring(0, text.indexOf(" "));
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
    static calcDistancePercentage(text, term) {
        let longer = text.toLowerCase().trim();
        let shorter = term.toLowerCase().trim();
        if (longer.length < shorter.length) {
            // greater length
            let temp = longer;
            longer = shorter;
            shorter = temp;
        }
        let longerLength = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        let distance = levenshtein.get(longer, shorter);
        return Math.round((longerLength - distance) / longerLength * 100) / 100;
    }
}
exports.HowLongToBeatParser = HowLongToBeatParser;
//# sourceMappingURL=howlongtobeat.js.map