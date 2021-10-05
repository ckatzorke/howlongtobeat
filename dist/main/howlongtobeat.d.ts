export declare class HowLongToBeatService {
    private scraper;
    static BASE_URL: string;
    static DETAIL_URL: string;
    static SEARCH_URL: string;
    constructor();
    /**
     * Get HowLongToBeatEntry from game id, by fetching the detail page like https://howlongtobeat.com/game.php?id=6974 and parsing it.
     * @param gameId the hltb internal gameid
     * @return Promise<HowLongToBeatEntry> the promise that, when fullfilled, returns the game
     */
    detail(gameId: string): Promise<HowLongToBeatEntry>;
    search(query: string): Promise<Array<HowLongToBeatEntry>>;
}
/**
 * Encapsulates a game detail
 */
export declare class HowLongToBeatEntry {
    readonly id: string;
    readonly name: string;
    readonly nameComplete: string;
    readonly description: string;
    readonly platforms: string[];
    readonly imageUrl: string;
    readonly timeLabels: Array<string[]>;
    readonly gameplayMain: number;
    readonly gameplayMainExtra: number;
    readonly gameplayCompletionist: number;
    readonly similarity: number;
    readonly searchTerm: string;
    readonly playableOn: string[];
    constructor(id: string, name: string, nameComplete: string, description: string, platforms: string[], imageUrl: string, timeLabels: Array<string[]>, gameplayMain: number, gameplayMainExtra: number, gameplayCompletionist: number, similarity: number, searchTerm: string);
}
/**
 * Internal helper class to parse html and create a HowLongToBeatEntry
 */
export declare class HowLongToBeatParser {
    /**
     * Parses the passed html to generate a HowLongToBeatyEntrys.
     * All the dirty DOM parsing and element traversing is done here.
     * @param html the html as basis for the parsing. taking directly from the response of the hltb detail page
     * @param id the hltb internal id
     * @return HowLongToBeatEntry representing the page
     */
    static parseDetails(html: string, id: string): HowLongToBeatEntry;
    /**
     * Parses the passed html to generate an Array of HowLongToBeatyEntrys.
     * All the dirty DOM parsing and element traversing is done here.
     * @param html the html as basis for the parsing. taking directly from the response of the hltb search
     * @param searchTerm the query what was searched, only used to calculate the similarity
     * @return an Array<HowLongToBeatEntry>s
     */
    static parseSearch(html: string, searchTerm: string): Array<HowLongToBeatEntry>;
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
    private static isOnlineGameTimeData;
    /**
     * Utility method used for parsing a given input text (like
     * &quot;44&#189;&quot;) as double (like &quot;44.5&quot;). The input text
     * represents the amount of hours needed to play this game.
     *
     * @param text
     *            representing the hours
     * @return the pares time as double
     */
    private static parseTime;
    /**
     * Parses a range of numbers and creates the average.
     * @param text
     *            like '5 Hours - 12 Hours' or '2½ Hours - 33½ Hours'
     * @return the arithmetic median of the range
     */
    private static handleRange;
    /**
     * Parses a string to get a number
     * @param text,
     *            can be '12 Hours' or '5½ Hours' or '50 Mins'
     * @return the ttime, parsed from text
     */
    private static getTime;
    /**
     * Calculates the similarty of two strings based on the levenshtein distance in relation to the string lengths.
     * It is used to see how similar the search term is to the game name. This, of course has only relevance if the search term is really specific and matches the game name as good as possible.
     * When using a proper search index, this would be the ranking/rating and much more sophisticated than this helper.
     * @param text the text to compare to
     * @param term the string of which the similarity is wanted
     */
    static calcDistancePercentage(text: string, term: string): number;
}
