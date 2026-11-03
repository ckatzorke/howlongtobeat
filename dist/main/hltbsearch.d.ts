/**
 * What /<search endpoint>/init returned: the token, plus an optional "honeypot" key/value pair
 * that some versions of the site asked to be sent back with the search.
 */
export interface HltbAuth {
    token: string;
    hpKey?: string;
    hpVal?: string;
}
/**
 * Takes care about the http connection and response handling.
 *
 * howlongtobeat.com protects its search endpoint and changes it from time to time
 * (/api/search, /api/s/<key>, /api/find, now /api/search/site). The current flow is:
 *   1. GET  <endpoint>/init?t=<ms>  ->  { "token": "..." }
 *   2. POST <endpoint>              with header `x-auth-token: <token>`
 *
 * Instead of hard-coding the endpoint, it is read from the site's own JavaScript
 * (the script that both POSTs to the endpoint and calls its /init), and cached.
 * When discovery fails, the last known endpoint is used. When a search is rejected,
 * the endpoint and the token are discovered again and the search is retried once.
 */
export declare class HltbSearch {
    static BASE_URL: string;
    static DETAIL_URL: string;
    static IMAGE_URL: string;
    /** last known search endpoint, used when it cannot be read from the site's scripts */
    static FALLBACK_SEARCH_PATH: string;
    /** how long a token is reused before asking for a new one */
    static TOKEN_TTL_MS: number;
    /** how long a discovered endpoint is trusted (shared by all instances) */
    static ENDPOINT_TTL_MS: number;
    private static discoveredPath;
    private static discoveredAt;
    /** one user agent per instance, so all requests of a search look like the same browser */
    private userAgent;
    private auth;
    private authPath;
    private authFetchedAt;
    payload: any;
    private headers;
    detailHtml(gameId: string, signal?: AbortSignal): Promise<string>;
    search(query: Array<string>, signal?: AbortSignal): Promise<any>;
    private postSearch;
    /**
     * The search endpoint path (like "/api/search/site"): cached, discovered from the site's
     * scripts when needed, or the last known one if that fails.
     */
    getSearchPath(signal?: AbortSignal, refresh?: boolean): Promise<string>;
    /**
     * Loads the home page, then its Next.js chunks one by one, until one of them reveals the endpoint.
     */
    private discoverSearchPath;
    /**
     * The /_next/static/chunks/ scripts referenced by a page.
     */
    static findChunkScripts(html: string): string[];
    /**
     * Finds the search endpoint in one script.
     * Candidates are the paths the script POSTs to with fetch(). A candidate is "strong" when
     * the same script also calls its /init (the token request), "weak" when the script at least
     * sends an x-auth-token. Other POSTs (like /api/error) are ignored.
     */
    static findSearchPath(js: string): {
        path: string;
        confidence: 'strong' | 'weak';
    };
    /**
     * Returns the cached token for this endpoint, or fetches a new one from <endpoint>/init.
     */
    getAuth(path: string, signal?: AbortSignal, forceNew?: boolean): Promise<HltbAuth>;
    /**
     * Reads the token, and the honeypot pair when present (any other field whose name
     * contains "key", and one whose name contains "val").
     */
    static parseAuth(data: any): HltbAuth;
    /** forgets the discovered endpoint (used by tests and after site changes) */
    static resetDiscovery(): void;
    private static absolute;
    private static status;
    /** rejected token (401/403) or endpoint gone (404/405) */
    private static isRetryable;
    private static isCancel;
    /**
     * Turns an axios error into an Error with a readable message.
     * Cancellations keep axios' "canceled" message, which callers rely on.
     */
    private static toError;
}
