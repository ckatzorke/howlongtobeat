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
 * Takes care about the http connection and response handling
 */
class HltbSearch {
    constructor() {
        this.payload = {
            "searchType": "games",
            "searchTerms": [],
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
        };
        this.searchToken = null;
    }
    /**
     * Validates that a gameId is a safe numeric string to prevent SSRF/URL injection.
     */
    static validateGameId(gameId) {
        if (!/^\d+$/.test(gameId)) {
            throw new Error(`Invalid gameId: "${gameId}". Game ID must be a numeric value.`);
        }
    }
    /**
     * Fetches a search token from HLTB's /api/find/init endpoint.
     * Returns the token, honeypot key, and honeypot value needed for search requests.
     */
    fetchSearchToken(signal) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.searchToken) {
                return this.searchToken;
            }
            const userAgent = new UserAgent().toString();
            const result = yield axios.get(`${HltbSearch.SEARCH_INIT_URL}?t=${Date.now()}`, {
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
        });
    }
    /**
     * Clears the cached search token so the next search request fetches a fresh one.
     */
    clearSearchToken() {
        this.searchToken = null;
    }
    detailHtml(gameId, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            HltbSearch.validateGameId(gameId);
            try {
                let result = yield axios.get(`${HltbSearch.DETAIL_URL}${gameId}`, {
                    headers: {
                        'User-Agent': new UserAgent().toString(),
                        'origin': 'https://howlongtobeat.com',
                        'referer': 'https://howlongtobeat.com'
                    },
                    timeout: 20000,
                    signal,
                });
                return result.data;
            }
            catch (error) {
                if (error.response && error.response.status) {
                    throw new Error(`Got non-200 status code from howlongtobeat.com for game ${gameId} [${error.response.status}]`);
                }
                throw error;
            }
        });
    }
    search(query, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._doSearch(query, signal, false);
        });
    }
    _doSearch(query, signal, isRetry) {
        return __awaiter(this, void 0, void 0, function* () {
            let search = Object.assign({}, this.payload);
            search.searchTerms = query;
            try {
                const { token, hpKey, hpVal, userAgent } = yield this.fetchSearchToken(signal);
                // Add the honeypot field to the payload as the site expects
                search[hpKey] = hpVal;
                let result = yield axios.post(HltbSearch.SEARCH_URL, search, {
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
            }
            catch (error) {
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
        });
    }
}
HltbSearch.BASE_URL = 'https://howlongtobeat.com/';
HltbSearch.DETAIL_URL = `${HltbSearch.BASE_URL}game?id=`;
HltbSearch.SEARCH_URL = `${HltbSearch.BASE_URL}api/find`;
HltbSearch.SEARCH_INIT_URL = `${HltbSearch.BASE_URL}api/find/init`;
HltbSearch.IMAGE_URL = `${HltbSearch.BASE_URL}games/`;
exports.HltbSearch = HltbSearch;
//# sourceMappingURL=hltbsearch.js.map