"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HltbSearch = void 0;
const axios = require('axios');
const UserAgent = require('user-agents');
const cheerio = require('cheerio');
/**
 * Takes care about the http connection and response handling
 */
class HltbSearch {
    constructor() {
        this.payload = {
            "searchType": "games",
            "searchTerms": [""],
            "searchPage": 1,
            "size": 20,
            "searchOptions": {
                "games": {
                    "userId": 0,
                    "platform": "",
                    "sortCategory": "popular",
                    "rangeCategory": "main",
                    "rangeTime": {
                        "min": null,
                        "max": null
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
                "randomizer": 0,
                "useCache": true
            }
        };
    }
    detailHtml(gameId, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let result = yield axios.get(`${HltbSearch.DETAIL_URL}${gameId}`, {
                    headers: {
                        'User-Agent': new UserAgent().toString(),
                        'origin': 'https://howlongtobeat.com',
                        'referer': 'https://howlongtobeat.com'
                    },
                    timeout: 20000,
                    signal,
                }).catch(e => { throw e; });
                return result.data;
            }
            catch (error) {
                if (error) {
                    throw new Error(error);
                }
                else if (error.response.status !== 200) {
                    throw new Error(`Got non-200 status code from howlongtobeat.com [${error.response.status}]
          ${JSON.stringify(error.response)}
        `);
                }
            }
        });
    }
    search(query, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use built-in javascript URLSearchParams as a drop-in replacement to create axios.post required data param
            let search = Object.assign({}, this.payload);
            search.searchTerms = query;
            try {
                if (!this.searchKey) {
                    this.searchKey = yield this.getSearchKey();
                }
                const searchUrlWithKey = HltbSearch.SEARCH_URL + this.searchKey;
                let result = yield axios.post(searchUrlWithKey, search, {
                    headers: {
                        "User-Agent": new UserAgent().toString(),
                        'Accept': '*/*',
                        "Content-Type": "application/json",
                        "Origin": "https://howlongtobeat.com",
                        "Referer": `https://howlongtobeat.com/`,
                    },
                    timeout: 20000,
                    signal,
                });
                return result.data;
            }
            catch (error) {
                if (error) {
                    throw new Error(error);
                }
                else if (error.response.status !== 200) {
                    throw new Error(`Got non-200 status code from howlongtobeat.com [${error.response.status}]
              ${JSON.stringify(error.response)}
            `);
                }
            }
        });
    }
    getSearchKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield axios.get(HltbSearch.BASE_URL, {
                headers: {
                    "User-Agent": new UserAgent().toString(),
                    origin: "https://howlongtobeat.com",
                    referer: "https://howlongtobeat.com",
                },
            });
            const html = res.data;
            const $ = cheerio.load(html);
            const scripts = $("script[src]");
            for (const el of scripts) {
                const src = $(el).attr("src");
                if (!src.includes("_app-")) {
                    continue;
                }
                const scriptUrl = HltbSearch.BASE_URL + src;
                try {
                    const res = yield axios.get(scriptUrl, {
                        headers: {
                            "User-Agent": new UserAgent().toString(),
                            origin: "https://howlongtobeat.com",
                            referer: "https://howlongtobeat.com",
                        },
                    });
                    const scriptText = res.data;
                    const matches = [...scriptText.matchAll(HltbSearch.SEARCH_KEY_PATTERN)];
                    const firstKey = matches[0][1];
                    const secondKey = matches[0][2];
                    return firstKey.concat(secondKey);
                }
                catch (error) {
                    continue;
                }
            }
            throw new Error("Could not find search key");
        });
    }
}
HltbSearch.BASE_URL = 'https://howlongtobeat.com/';
HltbSearch.DETAIL_URL = `${HltbSearch.BASE_URL}game?id=`;
HltbSearch.SEARCH_URL = `${HltbSearch.BASE_URL}api/locate/`;
HltbSearch.IMAGE_URL = `${HltbSearch.BASE_URL}games/`;
HltbSearch.SEARCH_KEY_PATTERN = /"\/api\/locate\/".concat\("([a-zA-Z0-9]+)"\).concat\("([a-zA-Z0-9]+)"\)/g;
exports.HltbSearch = HltbSearch;
//# sourceMappingURL=hltbsearch.js.map