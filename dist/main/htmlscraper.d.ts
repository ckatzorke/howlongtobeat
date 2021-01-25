/**
 * Takes care about the http connection and response handling
 */
export declare class HtmlScraper {
    detailHtml(url: string): Promise<string>;
    search(query: string, url: string): Promise<string>;
}
