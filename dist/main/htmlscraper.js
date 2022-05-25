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
class HtmlScraper {
    detailHtml(url, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let result = yield axios.get(url, {
                    followRedirect: false,
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
    search(query, url, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use built-in javascript URLSearchParams as a drop-in replacement to create axios.post required data param
            let form = new URLSearchParams();
            form.append('queryString', query);
            form.append('t', 'games');
            form.append('sorthead', 'popular');
            form.append('sortd', 'Normal Order');
            form.append('plat', '');
            form.append('length_type', 'main');
            form.append('length_min', '');
            form.append('length_max', '');
            form.append('detail', '0');
            form.append('v', '');
            form.append('f', '');
            form.append('g', '');
            form.append('randomize', '0');
            try {
                let result = yield axios.post(url, form, {
                    qs: {
                        page: 1
                    },
                    headers: {
                        'Content-type': 'application/x-www-form-urlencoded',
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
}
exports.HtmlScraper = HtmlScraper;
//# sourceMappingURL=htmlscraper.js.map