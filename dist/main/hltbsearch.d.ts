/**
 * Takes care about the http connection and response handling.
 *
 * Since late 2025 howlongtobeat.com protects its search endpoint with a short-lived token:
 *   1. GET  /api/search/site/init?t=<ms>  ->  { "token": "..." }
 *   2. POST /api/search/site              with header `x-auth-token: <token>`
 * Without the token the search answers 403. The token is cached and fetched again
 * when it expires or when the server rejects it.
 */
export declare class HltbSearch {
    static BASE_URL: string;
    static DETAIL_URL: string;
    static SEARCH_URL: string;
    static INIT_URL: string;
    static IMAGE_URL: string;
    /** how long a token is reused before asking for a new one */
    static TOKEN_TTL_MS: number;
    /** one user agent per instance, so the token request and the search look like the same browser */
    private userAgent;
    private token;
    private tokenFetchedAt;
    payload: any;
    private headers;
    detailHtml(gameId: string, signal?: AbortSignal): Promise<string>;
    search(query: Array<string>, signal?: AbortSignal): Promise<any>;
    private postSearch;
    /**
     * Returns the cached search token, or fetches a new one from /api/search/site/init.
     */
    getToken(signal?: AbortSignal, forceNew?: boolean): Promise<string>;
    private static isAuthError;
    /**
     * Turns an axios error into an Error with a readable message.
     * Cancellations keep axios' "canceled" message, which callers rely on.
     */
    private static toError;
}
