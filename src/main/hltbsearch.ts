const axios: any = require('axios');
const UserAgent: any = require('user-agents');


/**
 * Takes care about the http connection and response handling.
 *
 * Since late 2025 howlongtobeat.com protects its search endpoint with a short-lived token:
 *   1. GET  /api/search/site/init?t=<ms>  ->  { "token": "..." }
 *   2. POST /api/search/site              with header `x-auth-token: <token>`
 * Without the token the search answers 403. The token is cached and fetched again
 * when it expires or when the server rejects it.
 */
export class HltbSearch {
  public static BASE_URL: string = 'https://howlongtobeat.com/';
  public static DETAIL_URL: string = `${HltbSearch.BASE_URL}game/`;
  public static SEARCH_URL: string = `${HltbSearch.BASE_URL}api/search/site`;
  public static INIT_URL: string = `${HltbSearch.BASE_URL}api/search/site/init`;
  public static IMAGE_URL: string = `${HltbSearch.BASE_URL}games/`;

  /** how long a token is reused before asking for a new one */
  public static TOKEN_TTL_MS: number = 5 * 60 * 1000;

  /** one user agent per instance, so the token request and the search look like the same browser */
  private userAgent: string = new UserAgent().toString();
  private token: string = null;
  private tokenFetchedAt: number = 0;

  payload: any = {
    "searchType": "games",
    "searchTerms": [],
    "searchPage": 1,
    "size": 20,
    "searchOptions": {
      "games": {
        "userId": 0,
        "platform": { "mode": "include", "values": [] },
        "sortCategory": "popular",
        "rangeCategory": "main",
        "rangeTime": { "min": null, "max": null },
        "gameplay": {
          "perspective": { "mode": "include", "values": [] },
          "flow": { "mode": "include", "values": [] },
          "genre": { "mode": "include", "values": [] }
        },
        "year": { "mode": "include", "values": [] },
        "modifier": ""
      },
      "users": { "sortCategory": "postcount" },
      "lists": { "sortCategory": "follows" },
      "filter": "",
      "sort": 0,
      "randomizer": 0
    },
    "useCache": true
  }

  private headers(extra: any = {}): any {
    return {
      'User-Agent': this.userAgent,
      'origin': 'https://howlongtobeat.com',
      'referer': 'https://howlongtobeat.com/',
      ...extra
    };
  }

  async detailHtml(gameId: string, signal?: AbortSignal): Promise<string> {
    try {
      const result = await axios.get(`${HltbSearch.DETAIL_URL}${encodeURIComponent(gameId)}`, {
        headers: this.headers(),
        timeout: 20000,
        signal,
      });
      return result.data;
    } catch (error) {
      throw HltbSearch.toError(error);
    }
  }

  async search(query: Array<string>, signal?: AbortSignal): Promise<any> {
    const search = { ...this.payload, searchTerms: query };
    try {
      return await this.postSearch(search, signal, false);
    } catch (error) {
      // the token may have expired on the server before our TTL: get a fresh one and retry once
      if (HltbSearch.isAuthError(error)) {
        try {
          return await this.postSearch(search, signal, true);
        } catch (retryError) {
          throw HltbSearch.toError(retryError);
        }
      }
      throw HltbSearch.toError(error);
    }
  }

  private async postSearch(search: any, signal: AbortSignal, forceNewToken: boolean): Promise<any> {
    const token = await this.getToken(signal, forceNewToken);
    const result = await axios.post(HltbSearch.SEARCH_URL, search, {
      headers: this.headers({
        'content-type': 'application/json',
        'x-auth-token': token
      }),
      timeout: 20000,
      signal,
    });
    return result.data;
  }

  /**
   * Returns the cached search token, or fetches a new one from /api/search/site/init.
   */
  async getToken(signal?: AbortSignal, forceNew: boolean = false): Promise<string> {
    const fresh = this.token && (Date.now() - this.tokenFetchedAt) < HltbSearch.TOKEN_TTL_MS;
    if (fresh && !forceNew) {
      return this.token;
    }
    const result = await axios.get(`${HltbSearch.INIT_URL}?t=${Date.now()}`, {
      headers: this.headers(),
      timeout: 20000,
      signal,
    });
    const token = result.data && result.data.token;
    if (!token) {
      throw new Error('howlongtobeat.com did not return a search token (the API may have changed again)');
    }
    this.token = token;
    this.tokenFetchedAt = Date.now();
    return token;
  }

  private static isAuthError(error: any): boolean {
    const status = error && error.response && error.response.status;
    return status === 401 || status === 403;
  }

  /**
   * Turns an axios error into an Error with a readable message.
   * Cancellations keep axios' "canceled" message, which callers rely on.
   */
  private static toError(error: any): Error {
    if (error && error.response && error.response.status) {
      return new Error(`Got non-200 status code from howlongtobeat.com [${error.response.status}]`);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
}
