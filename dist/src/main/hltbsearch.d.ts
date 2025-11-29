/**
 * Takes care about the http connection and response handling
 */
export declare class HltbSearch {
    static BASE_URL: string;
    static DETAIL_URL: string;
    static SEARCH_URL: string;
    static IMAGE_URL: string;
    private searchKey;
    private static readonly SEARCH_KEY_PATTERN;
    payload: any;
    detailHtml(gameId: string, signal?: AbortSignal): Promise<string>;
    search(query: Array<string>, signal?: AbortSignal): Promise<any>;
    private getSearchKey;
}
