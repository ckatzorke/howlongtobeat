const axios: any = require('axios');
const UserAgent: any = require('user-agents');


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
export class HltbSearch {
  public static BASE_URL: string = 'https://howlongtobeat.com/';
  public static DETAIL_URL: string = `${HltbSearch.BASE_URL}game/`;
  public static IMAGE_URL: string = `${HltbSearch.BASE_URL}games/`;

  /** last known search endpoint, used when it cannot be read from the site's scripts */
  public static FALLBACK_SEARCH_PATH: string = '/api/search/site';

  /** how long a token is reused before asking for a new one */
  public static TOKEN_TTL_MS: number = 5 * 60 * 1000;
  /** how long a discovered endpoint is trusted (shared by all instances) */
  public static ENDPOINT_TTL_MS: number = 60 * 60 * 1000;

  private static discoveredPath: string = null;
  private static discoveredAt: number = 0;

  /** one user agent per instance, so all requests of a search look like the same browser */
  private userAgent: string = new UserAgent().toString();
  private auth: HltbAuth = null;
  private authPath: string = null;
  private authFetchedAt: number = 0;

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
      // the token expired, or the site moved its endpoint: discover both again and retry once
      if (HltbSearch.isRetryable(error)) {
        try {
          return await this.postSearch(search, signal, true);
        } catch (retryError) {
          throw HltbSearch.toError(retryError);
        }
      }
      throw HltbSearch.toError(error);
    }
  }

  private async postSearch(search: any, signal: AbortSignal, refresh: boolean): Promise<any> {
    const path = await this.getSearchPath(signal, refresh);
    const auth = await this.getAuth(path, signal, refresh);
    const headers: any = { 'content-type': 'application/json', 'x-auth-token': auth.token };
    let body = search;
    if (auth.hpKey) {
      headers['x-hp-key'] = auth.hpKey;
      headers['x-hp-val'] = auth.hpVal;
      body = { ...search, [auth.hpKey]: auth.hpVal };
    }
    const result = await axios.post(HltbSearch.absolute(path), body, {
      headers: this.headers(headers),
      timeout: 20000,
      signal,
    });
    return result.data;
  }

  /**
   * The search endpoint path (like "/api/search/site"): cached, discovered from the site's
   * scripts when needed, or the last known one if that fails.
   */
  async getSearchPath(signal?: AbortSignal, refresh: boolean = false): Promise<string> {
    const fresh = HltbSearch.discoveredPath && (Date.now() - HltbSearch.discoveredAt) < HltbSearch.ENDPOINT_TTL_MS;
    if (fresh && !refresh) {
      return HltbSearch.discoveredPath;
    }
    let path: string = null;
    try {
      path = await this.discoverSearchPath(signal);
    } catch (error) {
      if (HltbSearch.isCancel(error)) {
        throw error;
      }
      // network or parsing trouble: fall back below
    }
    HltbSearch.discoveredPath = path || HltbSearch.FALLBACK_SEARCH_PATH;
    HltbSearch.discoveredAt = Date.now();
    return HltbSearch.discoveredPath;
  }

  /**
   * Loads the home page, then its Next.js chunks one by one, until one of them reveals the endpoint.
   */
  private async discoverSearchPath(signal?: AbortSignal): Promise<string> {
    const home = await axios.get(HltbSearch.BASE_URL, { headers: this.headers(), timeout: 20000, signal });
    const scripts = HltbSearch.findChunkScripts(home.data);
    let weakMatch: string = null;
    for (const src of scripts) {
      let js: string;
      try {
        js = (await axios.get(HltbSearch.absolute(src), { headers: this.headers(), timeout: 20000, signal })).data;
      } catch (error) {
        if (HltbSearch.isCancel(error)) {
          throw error;
        }
        continue;
      }
      const found = HltbSearch.findSearchPath(String(js));
      if (found && found.confidence === 'strong') {
        return found.path;
      }
      if (found && !weakMatch) {
        weakMatch = found.path;
      }
    }
    return weakMatch;
  }

  /**
   * The /_next/static/chunks/ scripts referenced by a page.
   */
  static findChunkScripts(html: string): string[] {
    const scripts: string[] = [];
    const re = /<script[^>]+src=["']([^"']+)["']/gi;
    let m: RegExpExecArray;
    while ((m = re.exec(html || '')) !== null) {
      if (m[1].indexOf('/_next/static/chunks/') > -1) {
        scripts.push(m[1]);
      }
    }
    return scripts;
  }

  /**
   * Finds the search endpoint in one script.
   * Candidates are the paths the script POSTs to with fetch(). A candidate is "strong" when
   * the same script also calls its /init (the token request), "weak" when the script at least
   * sends an x-auth-token. Other POSTs (like /api/error) are ignored.
   */
  static findSearchPath(js: string): { path: string, confidence: 'strong' | 'weak' } {
    const re = /fetch\s*\(\s*["'`](\/api\/[a-zA-Z0-9_\/-]+?)\/?(?:[?#][^"'`]*)?["'`]\s*,\s*\{[^}]*?method\s*:\s*["']POST["']/gi;
    const candidates: string[] = [];
    let m: RegExpExecArray;
    while ((m = re.exec(js)) !== null) {
      if (candidates.indexOf(m[1]) < 0) {
        candidates.push(m[1]);
      }
    }
    for (const path of candidates) {
      if (js.indexOf(`${path}/init`) > -1) {
        return { path, confidence: 'strong' };
      }
    }
    if (candidates.length > 0 && js.indexOf('x-auth-token') > -1) {
      return { path: candidates[0], confidence: 'weak' };
    }
    return null;
  }

  /**
   * Returns the cached token for this endpoint, or fetches a new one from <endpoint>/init.
   */
  async getAuth(path: string, signal?: AbortSignal, forceNew: boolean = false): Promise<HltbAuth> {
    const fresh = this.auth && this.authPath === path && (Date.now() - this.authFetchedAt) < HltbSearch.TOKEN_TTL_MS;
    if (fresh && !forceNew) {
      return this.auth;
    }
    const result = await axios.get(`${HltbSearch.absolute(path)}/init?t=${Date.now()}`, {
      headers: this.headers(),
      timeout: 20000,
      signal,
    });
    const auth = HltbSearch.parseAuth(result.data);
    if (!auth) {
      throw new Error('howlongtobeat.com did not return a search token (the API may have changed again)');
    }
    this.auth = auth;
    this.authPath = path;
    this.authFetchedAt = Date.now();
    return auth;
  }

  /**
   * Reads the token, and the honeypot pair when present (any other field whose name
   * contains "key", and one whose name contains "val").
   */
  static parseAuth(data: any): HltbAuth {
    if (!data || typeof data !== 'object' || !data.token) {
      return null;
    }
    const auth: HltbAuth = { token: String(data.token) };
    for (const name of Object.keys(data)) {
      if (name === 'token') {
        continue;
      }
      const lower = name.toLowerCase();
      if (lower.indexOf('key') > -1) {
        auth.hpKey = String(data[name]);
      } else if (lower.indexOf('val') > -1) {
        auth.hpVal = String(data[name]);
      }
    }
    if (auth.hpKey && auth.hpVal === undefined) {
      auth.hpVal = '';
    }
    return auth;
  }

  /** forgets the discovered endpoint (used by tests and after site changes) */
  static resetDiscovery(): void {
    HltbSearch.discoveredPath = null;
    HltbSearch.discoveredAt = 0;
  }

  private static absolute(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return HltbSearch.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  }

  private static status(error: any): number {
    return error && error.response && error.response.status;
  }

  /** rejected token (401/403) or endpoint gone (404/405) */
  private static isRetryable(error: any): boolean {
    const status = HltbSearch.status(error);
    return status === 401 || status === 403 || status === 404 || status === 405;
  }

  private static isCancel(error: any): boolean {
    return !!error && (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || axios.isCancel && axios.isCancel(error));
  }

  /**
   * Turns an axios error into an Error with a readable message.
   * Cancellations keep axios' "canceled" message, which callers rely on.
   */
  private static toError(error: any): Error {
    const status = HltbSearch.status(error);
    if (status) {
      return new Error(`Got non-200 status code from howlongtobeat.com [${status}]`);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
}
