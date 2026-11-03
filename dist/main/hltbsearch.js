"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios = require('axios');
const UserAgent = require('user-agents');
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
class HltbSearch {
    constructor() {
        /** one user agent per instance, so all requests of a search look like the same browser */
        this.userAgent = new UserAgent().toString();
        this.auth = null;
        this.authPath = null;
        this.authFetchedAt = 0;
        this.payload = {
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
        };
    }
    headers(extra = {}) {
        return Object.assign({ 'User-Agent': this.userAgent, 'origin': 'https://howlongtobeat.com', 'referer': 'https://howlongtobeat.com/' }, extra);
    }
    detailHtml(gameId, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield axios.get(`${HltbSearch.DETAIL_URL}${encodeURIComponent(gameId)}`, {
                    headers: this.headers(),
                    timeout: 20000,
                    signal,
                });
                return result.data;
            }
            catch (error) {
                throw HltbSearch.toError(error);
            }
        });
    }
    search(query, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            const search = Object.assign({}, this.payload, { searchTerms: query });
            try {
                return yield this.postSearch(search, signal, false);
            }
            catch (error) {
                // the token expired, or the site moved its endpoint: discover both again and retry once
                if (HltbSearch.isRetryable(error)) {
                    try {
                        return yield this.postSearch(search, signal, true);
                    }
                    catch (retryError) {
                        throw HltbSearch.toError(retryError);
                    }
                }
                throw HltbSearch.toError(error);
            }
        });
    }
    postSearch(search, signal, refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = yield this.getSearchPath(signal, refresh);
            const auth = yield this.getAuth(path, signal, refresh);
            const headers = { 'content-type': 'application/json', 'x-auth-token': auth.token };
            let body = search;
            if (auth.hpKey) {
                headers['x-hp-key'] = auth.hpKey;
                headers['x-hp-val'] = auth.hpVal;
                body = Object.assign({}, search, { [auth.hpKey]: auth.hpVal });
            }
            const result = yield axios.post(HltbSearch.absolute(path), body, {
                headers: this.headers(headers),
                timeout: 20000,
                signal,
            });
            return result.data;
        });
    }
    /**
     * The search endpoint path (like "/api/search/site"): cached, discovered from the site's
     * scripts when needed, or the last known one if that fails.
     */
    getSearchPath(signal, refresh = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const fresh = HltbSearch.discoveredPath && (Date.now() - HltbSearch.discoveredAt) < HltbSearch.ENDPOINT_TTL_MS;
            if (fresh && !refresh) {
                return HltbSearch.discoveredPath;
            }
            let path = null;
            try {
                path = yield this.discoverSearchPath(signal);
            }
            catch (error) {
                if (HltbSearch.isCancel(error)) {
                    throw error;
                }
                // network or parsing trouble: fall back below
            }
            HltbSearch.discoveredPath = path || HltbSearch.FALLBACK_SEARCH_PATH;
            HltbSearch.discoveredAt = Date.now();
            return HltbSearch.discoveredPath;
        });
    }
    /**
     * Loads the home page, then its Next.js chunks one by one, until one of them reveals the endpoint.
     */
    discoverSearchPath(signal) {
        return __awaiter(this, void 0, void 0, function* () {
            const home = yield axios.get(HltbSearch.BASE_URL, { headers: this.headers(), timeout: 20000, signal });
            const scripts = HltbSearch.findChunkScripts(home.data);
            let weakMatch = null;
            for (const src of scripts) {
                let js;
                try {
                    js = (yield axios.get(HltbSearch.absolute(src), { headers: this.headers(), timeout: 20000, signal })).data;
                }
                catch (error) {
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
        });
    }
    /**
     * The /_next/static/chunks/ scripts referenced by a page.
     */
    static findChunkScripts(html) {
        const scripts = [];
        const re = /<script[^>]+src=["']([^"']+)["']/gi;
        let m;
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
    static findSearchPath(js) {
        const re = /fetch\s*\(\s*["'`](\/api\/[a-zA-Z0-9_\/-]+?)\/?(?:[?#][^"'`]*)?["'`]\s*,\s*\{[^}]*?method\s*:\s*["']POST["']/gi;
        const candidates = [];
        let m;
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
    getAuth(path, signal, forceNew = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const fresh = this.auth && this.authPath === path && (Date.now() - this.authFetchedAt) < HltbSearch.TOKEN_TTL_MS;
            if (fresh && !forceNew) {
                return this.auth;
            }
            const result = yield axios.get(`${HltbSearch.absolute(path)}/init?t=${Date.now()}`, {
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
        });
    }
    /**
     * Reads the token, and the honeypot pair when present (any other field whose name
     * contains "key", and one whose name contains "val").
     */
    static parseAuth(data) {
        if (!data || typeof data !== 'object' || !data.token) {
            return null;
        }
        const auth = { token: String(data.token) };
        for (const name of Object.keys(data)) {
            if (name === 'token') {
                continue;
            }
            const lower = name.toLowerCase();
            if (lower.indexOf('key') > -1) {
                auth.hpKey = String(data[name]);
            }
            else if (lower.indexOf('val') > -1) {
                auth.hpVal = String(data[name]);
            }
        }
        if (auth.hpKey && auth.hpVal === undefined) {
            auth.hpVal = '';
        }
        return auth;
    }
    /** forgets the discovered endpoint (used by tests and after site changes) */
    static resetDiscovery() {
        HltbSearch.discoveredPath = null;
        HltbSearch.discoveredAt = 0;
    }
    static absolute(path) {
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        return HltbSearch.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    }
    static status(error) {
        return error && error.response && error.response.status;
    }
    /** rejected token (401/403) or endpoint gone (404/405) */
    static isRetryable(error) {
        const status = HltbSearch.status(error);
        return status === 401 || status === 403 || status === 404 || status === 405;
    }
    static isCancel(error) {
        return !!error && (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || axios.isCancel && axios.isCancel(error));
    }
    /**
     * Turns an axios error into an Error with a readable message.
     * Cancellations keep axios' "canceled" message, which callers rely on.
     */
    static toError(error) {
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
HltbSearch.BASE_URL = 'https://howlongtobeat.com/';
HltbSearch.DETAIL_URL = `${HltbSearch.BASE_URL}game/`;
HltbSearch.IMAGE_URL = `${HltbSearch.BASE_URL}games/`;
/** last known search endpoint, used when it cannot be read from the site's scripts */
HltbSearch.FALLBACK_SEARCH_PATH = '/api/search/site';
/** how long a token is reused before asking for a new one */
HltbSearch.TOKEN_TTL_MS = 5 * 60 * 1000;
/** how long a discovered endpoint is trusted (shared by all instances) */
HltbSearch.ENDPOINT_TTL_MS = 60 * 60 * 1000;
HltbSearch.discoveredPath = null;
HltbSearch.discoveredAt = 0;
exports.HltbSearch = HltbSearch;
//# sourceMappingURL=hltbsearch.js.map