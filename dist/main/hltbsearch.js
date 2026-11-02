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
 * Since late 2025 howlongtobeat.com protects its search endpoint with a short-lived token:
 *   1. GET  /api/search/site/init?t=<ms>  ->  { "token": "..." }
 *   2. POST /api/search/site              with header `x-auth-token: <token>`
 * Without the token the search answers 403. The token is cached and fetched again
 * when it expires or when the server rejects it.
 */
class HltbSearch {
    constructor() {
        /** one user agent per instance, so the token request and the search look like the same browser */
        this.userAgent = new UserAgent().toString();
        this.token = null;
        this.tokenFetchedAt = 0;
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
                // the token may have expired on the server before our TTL: get a fresh one and retry once
                if (HltbSearch.isAuthError(error)) {
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
    postSearch(search, signal, forceNewToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.getToken(signal, forceNewToken);
            const result = yield axios.post(HltbSearch.SEARCH_URL, search, {
                headers: this.headers({
                    'content-type': 'application/json',
                    'x-auth-token': token
                }),
                timeout: 20000,
                signal,
            });
            return result.data;
        });
    }
    /**
     * Returns the cached search token, or fetches a new one from /api/search/site/init.
     */
    getToken(signal, forceNew = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const fresh = this.token && (Date.now() - this.tokenFetchedAt) < HltbSearch.TOKEN_TTL_MS;
            if (fresh && !forceNew) {
                return this.token;
            }
            const result = yield axios.get(`${HltbSearch.INIT_URL}?t=${Date.now()}`, {
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
        });
    }
    static isAuthError(error) {
        const status = error && error.response && error.response.status;
        return status === 401 || status === 403;
    }
    /**
     * Turns an axios error into an Error with a readable message.
     * Cancellations keep axios' "canceled" message, which callers rely on.
     */
    static toError(error) {
        if (error && error.response && error.response.status) {
            return new Error(`Got non-200 status code from howlongtobeat.com [${error.response.status}]`);
        }
        if (error instanceof Error) {
            return error;
        }
        return new Error(String(error));
    }
}
HltbSearch.BASE_URL = 'https://howlongtobeat.com/';
HltbSearch.DETAIL_URL = `${HltbSearch.BASE_URL}game/`;
HltbSearch.SEARCH_URL = `${HltbSearch.BASE_URL}api/search/site`;
HltbSearch.INIT_URL = `${HltbSearch.BASE_URL}api/search/site/init`;
HltbSearch.IMAGE_URL = `${HltbSearch.BASE_URL}games/`;
/** how long a token is reused before asking for a new one */
HltbSearch.TOKEN_TTL_MS = 5 * 60 * 1000;
exports.HltbSearch = HltbSearch;
//# sourceMappingURL=hltbsearch.js.map