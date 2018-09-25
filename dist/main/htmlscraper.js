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
const unirest = require('unirest');
/**
 * Takes care about the http connection and response handling
 */
class HtmlScraper {
    detailHtml(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = new Promise((resolve, reject) => {
                unirest.get(url).followRedirect(false).end((response) => {
                    if (response && response.status === 200 && response.body) {
                        resolve(response.body);
                    }
                    else {
                        reject(new Error('error occurred!'));
                    }
                });
            });
            return result;
        });
    }
    search(query, url) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = new Promise((resolve, reject) => {
                unirest.post(url)
                    .headers({
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'accept': '*/*'
                })
                    .query('page=1')
                    .form({
                    'queryString': query,
                    't': 'games',
                    'sorthead': 'popular',
                    'sortd': 'Normal Order',
                    'plat': '',
                    'length_type': 'main',
                    'length_min': '',
                    'length_max': '',
                    'detail': '0'
                })
                    .end((response) => {
                    if (response && response.status === 200 && response.body) {
                        resolve(response.body);
                    }
                    else {
                        reject(new Error('error occurred!'));
                    }
                });
            });
            return result;
        });
    }
}
exports.HtmlScraper = HtmlScraper;
//# sourceMappingURL=htmlscraper.js.map