const axios: any = require('axios');
const UserAgent: any = require('user-agents');


/**
 * Takes care about the http connection and response handling
 */
export class HltbSearch {
  public static BASE_URL: string = 'https://howlongtobeat.com/';
  public static DETAIL_URL: string = `${HltbSearch.BASE_URL}game?id=`;
  public static SEARCH_URL: string = `${HltbSearch.BASE_URL}api/find`;
  public static SEARCH_INIT_URL: string = `${HltbSearch.BASE_URL}api/find/init`;
  public static IMAGE_URL: string = `${HltbSearch.BASE_URL}games/`;

  payload: any = {
    "searchType": "games",
    "searchTerms": [

    ],
    "searchPage": 1,
    "size": 20,
    "searchOptions": {
      "games": {
        "userId": 0,
        "platform": "",
        "sortCategory": "popular",
        "rangeCategory": "main",
        "rangeTime": {
          "min": 0,
          "max": 0
        },
        "gameplay": {
          "perspective": "",
          "flow": "",
          "genre": "",
          "difficulty": ""
        },
        "rangeYear": {
          "min": "",
          "max": ""
        },
        "modifier": ""
      },
      "users": {
        "sortCategory": "postcount"
      },
      "lists": {
        "sortCategory": "follows"
      },
      "filter": "",
      "sort": 0,
      "randomizer": 0
    },
    "useCache": true
  }

  private searchToken: { token: string; hpKey: string; hpVal: string; userAgent: string } | null = null;

  /**
   * Validates that a gameId is a safe numeric string to prevent SSRF/URL injection.
   */
  private static validateGameId(gameId: string): void {
    if (!/^\d+$/.test(gameId)) {
      throw new Error(`Invalid gameId: "${gameId}". Game ID must be a numeric value.`);
    }
  }

  /**
   * Fetches a search token from HLTB's /api/find/init endpoint.
   * Returns the token, honeypot key, and honeypot value needed for search requests.
   */
  private async fetchSearchToken(signal?: AbortSignal): Promise<{ token: string; hpKey: string; hpVal: string; userAgent: string }> {
    if (this.searchToken) {
      return this.searchToken;
    }
    const userAgent = new UserAgent().toString();
    const result = await axios.get(`${HltbSearch.SEARCH_INIT_URL}?t=${Date.now()}`, {
      headers: {
        'User-Agent': userAgent,
        'origin': 'https://howlongtobeat.com',
        'referer': 'https://howlongtobeat.com'
      },
      timeout: 20000,
      signal,
    });
    this.searchToken = {
      token: result.data.token,
      hpKey: result.data.hpKey,
      hpVal: result.data.hpVal,
      userAgent,
    };
    return this.searchToken;
  }

  /**
   * Clears the cached search token so the next search request fetches a fresh one.
   */
  private clearSearchToken(): void {
    this.searchToken = null;
  }

  async detailHtml(gameId: string, signal?: AbortSignal): Promise<string> {
    HltbSearch.validateGameId(gameId);
    try {
      let result =
        await axios.get(`${HltbSearch.DETAIL_URL}${gameId}`, {
          headers: {
            'User-Agent': new UserAgent().toString(),
            'origin': 'https://howlongtobeat.com',
            'referer': 'https://howlongtobeat.com'
          },
          timeout: 20000,
          signal,
        });
      return result.data;
    } catch (error) {
      if (error.response && error.response.status) {
        throw new Error(`Got non-200 status code from howlongtobeat.com for game ${gameId} [${error.response.status}]`);
      }
      throw error;
    }
  }

  async search(query: Array<string>, signal?: AbortSignal): Promise<any> {
    return this._doSearch(query, signal, false);
  }

  private async _doSearch(query: Array<string>, signal?: AbortSignal, isRetry?: boolean): Promise<any> {
    let search = { ...this.payload };
    search.searchTerms = query;
    try {
      const { token, hpKey, hpVal, userAgent } = await this.fetchSearchToken(signal);
      // Add the honeypot field to the payload as the site expects
      search[hpKey] = hpVal;

      let result =
        await axios.post(HltbSearch.SEARCH_URL, search, {
          headers: {
            'User-Agent': userAgent,
            'content-type': 'application/json',
            'origin': 'https://howlongtobeat.com',
            'referer': 'https://howlongtobeat.com',
            'x-auth-token': token,
            'x-hp-key': hpKey,
            'x-hp-val': hpVal,
          },
          timeout: 20000,
          signal,
        });
      return result.data;
    } catch (error) {
      // If we get a 403, the token may have expired — retry once with a fresh token
      if (!isRetry && error.response && error.response.status === 403) {
        this.clearSearchToken();
        return this._doSearch(query, signal, true);
      }
      if (error.response && error.response.status) {
        throw new Error(`Got non-200 status code from howlongtobeat.com for search [${query.join(' ')}] [${error.response.status}]`);
      }
      throw error;
    }
  }
}
