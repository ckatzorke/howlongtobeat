/**
 * Takes care about the http connection and response handling
 */
export declare class HltbSearch {
    static BASE_URL: string;
    static DETAIL_URL: string;
    static SEARCH_URL: string;
    static SEARCH_INIT_URL: string;
    static IMAGE_URL: string;
    payload: any;
    private searchToken;
    /**
     * Validates that a gameId is a safe numeric string to prevent SSRF/URL injection.
     */
    private static validateGameId;
    /**
     * Fetches a search token from HLTB's /api/find/init endpoint.
     * Returns the token, honeypot key, and honeypot value needed for search requests.
     */
    private fetchSearchToken;
    /**
     * Clears the cached search token so the next search request fetches a fresh one.
     */
    private clearSearchToken;
    detailHtml(gameId: string, signal?: AbortSignal): Promise<string>;
    search(query: Array<string>, signal?: AbortSignal): Promise<any>;
    private _doSearch;
}
