export declare type SearchOptions = {
    year: number;
} | {
    minYear: number;
    maxYear: number;
};
/**
 * Takes care about the http connection and response handling
 */
export declare class HltbSearch {
    static BASE_URL: string;
    static DETAIL_URL: string;
    static BASE_SEARCH_URL: string;
    static IMAGE_URL: string;
    payload: any;
    detailHtml(gameId: string, signal?: AbortSignal): Promise<string>;
    search(query: Array<string>, signal?: AbortSignal): Promise<any>;
    searchWithOptions(query: Array<string>, searchOptions?: SearchOptions, signal?: AbortSignal): Promise<any>;
    getSearchURLAppendix(parseAllScripts: boolean): Promise<string | null>;
}
