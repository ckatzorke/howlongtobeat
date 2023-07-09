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
const hltbsearch_1 = require("./hltbsearch");
class HowLongToBeatService {
    constructor() {
        this.hltb = new hltbsearch_1.HltbSearch();
    }
    /**
     * Get HowLongToBeatEntry from game id, by fetching the detail page like https://howlongtobeat.com/game.php?id=6974 and parsing it.
     * @param gameId the hltb internal gameid
     * @return Promise<HowLongToBeatEntry> the promise that, when fullfilled, returns the game
     */
    detail(gameId, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            let detailPage = yield this.hltb.detailHtml(gameId, signal);
            let entry = HowLongToBeatParser.parseDetails(detailPage, gameId);
            return entry;
        });
    }
    search(query, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchTerms = query.split(' ');
            let search = yield this.hltb.search(searchTerms, signal);
            // console.log(`Found ${search.count} results`);
            let hltbEntries = new Array();
            for (const resultEntry of search.data) {
                hltbEntries.push(new HowLongToBeatEntry('' + resultEntry.game_id, // game id is now a number, but I want to keep the model stable
                resultEntry.game_name, '', // no description
                resultEntry.profile_platform ? resultEntry.profile_platform.split(', ') : [], hltbsearch_1.HltbSearch.IMAGE_URL + resultEntry.game_image, [["Main", "Main"], ["Main + Extra", "Main + Extra"], ["Completionist", "Completionist"]], Math.round(resultEntry.comp_main / 3600), Math.round(resultEntry.comp_plus / 3600), Math.round(resultEntry.comp_100 / 3600), HowLongToBeatService.calcDistancePercentage(resultEntry.game_name, query), query));
            }
            return hltbEntries;
        });
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
            // longer should always have
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
        return Math.round(((longerLength - distance) / longerLength) * 100) / 100;
    }
}
exports.HowLongToBeatService = HowLongToBeatService;
/**
 * Encapsulates a game detail
 */
class HowLongToBeatEntry {
    constructor(id, name, description, 
    /* replaces playableOn */
    platforms, imageUrl, timeLabels, gameplayMain, gameplayMainExtra, gameplayCompletionist, similarity, searchTerm) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.platforms = platforms;
        this.imageUrl = imageUrl;
        this.timeLabels = timeLabels;
        this.gameplayMain = gameplayMain;
        this.gameplayMainExtra = gameplayMainExtra;
        this.gameplayCompletionist = gameplayCompletionist;
        this.similarity = similarity;
        this.searchTerm = searchTerm;
        this.playableOn = platforms;
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
        gameName = $('div[class*=GameHeader_profile_header__]')[0].children[0].data.trim();
        imageUrl = $('div[class*=GameHeader_game_image__]')[0].children[0].attribs.src;
        let liElements = $('div[class*=GameStats_game_times__] li');
        const gameDescription = $('.in.back_primary.shadow_box div[class*=GameSummary_large__]').text();
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
            let type = $(this)
                .find('h4')
                .text();
            let time = HowLongToBeatParser.parseTime($(this)
                .find('h5')
                .text());
            if (type.startsWith('Main Story') ||
                type.startsWith('Single-Player') ||
                type.startsWith('Solo')) {
                gameplayMain = time;
                timeLabels.push(['gameplayMain', type]);
            }
            else if (type.startsWith('Main + Sides') || type.startsWith('Co-Op')) {
                gameplayMainExtra = time;
                timeLabels.push(['gameplayMainExtra', type]);
            }
            else if (type.startsWith('Completionist') || type.startsWith('Vs.')) {
                gameplayComplete = time;
                timeLabels.push(['gameplayComplete', type]);
            }
        });
        return new HowLongToBeatEntry(id, gameName, gameDescription, platforms, imageUrl, timeLabels, gameplayMain, gameplayMainExtra, gameplayComplete, 1, gameName);
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
        let d = (HowLongToBeatParser.getTime(range[0]) +
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
    static getTime(text) {
        //check for Mins, then assume 1 hour at least
        const timeUnit = text.substring(text.indexOf(' ') + 1).trim();
        if (timeUnit === 'Mins') {
            return 1;
        }
        let time = text.substring(0, text.indexOf(' '));
        if (time.indexOf('½') > -1) {
            return 0.5 + parseInt(time.substring(0, text.indexOf('½')));
        }
        return parseInt(time);
    }
}
exports.HowLongToBeatParser = HowLongToBeatParser;
//# sourceMappingURL=howlongtobeat.js.map