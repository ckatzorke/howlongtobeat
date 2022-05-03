/**
 * Takes care about the http connection and response handling
 */
export declare class HtmlScraper {
    detailHtml(url: string, signal?: AbortSignal): Promise<string>;
    search(query: string, url: string, signal?: AbortSignal): Promise<string>;
}
