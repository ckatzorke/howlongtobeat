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
const chai = require("chai");
const hltbsearch_1 = require("../main/hltbsearch");
const howlongtobeat_1 = require("../main/howlongtobeat");
const axios = require('axios');
const assert = chai.assert;
/**
 * Replaces axios.get / axios.post with fakes that behave like howlongtobeat.com:
 * the init endpoint hands out tokens, the search endpoint accepts only a valid one.
 */
function fakeServer(options = {}) {
    const calls = [];
    let issued = 0;
    const valid = new Set();
    const originalGet = axios.get;
    const originalPost = axios.post;
    axios.get = (url, config) => __awaiter(this, void 0, void 0, function* () {
        calls.push({ method: 'GET', url, headers: config.headers });
        if (url.startsWith(hltbsearch_1.HltbSearch.INIT_URL + '?t=')) {
            issued++;
            const token = `token-${issued}`;
            if (!(options.rejectFirstToken && issued === 1)) {
                valid.add(token);
            }
            return { data: { token } };
        }
        throw new Error('unexpected GET ' + url);
    });
    axios.post = (url, body, config) => __awaiter(this, void 0, void 0, function* () {
        calls.push({ method: 'POST', url, body, headers: config.headers });
        if (url !== hltbsearch_1.HltbSearch.SEARCH_URL) {
            throw new Error('unexpected POST ' + url);
        }
        if (!valid.has(config.headers['x-auth-token'])) {
            const error = new Error('Request failed with status code 403');
            error.response = { status: 403 };
            throw error;
        }
        return {
            data: {
                count: 1,
                data: [{
                        game_id: 10001,
                        game_name: 'Fixture Quest',
                        game_image: '10001_Fixture_Quest.jpg',
                        profile_platform: 'PC, Nintendo Switch',
                        comp_main: 36000,
                        comp_plus: 55800,
                        comp_100: 90000
                    }]
            }
        };
    });
    return {
        calls,
        restore: () => { axios.get = originalGet; axios.post = originalPost; }
    };
}
describe('Testing HltbSearch token flow (no network)', () => {
    it('fetches a token, sends it as x-auth-token and posts the new payload', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer();
        try {
            const result = yield new hltbsearch_1.HltbSearch().search(['fixture', 'quest']);
            assert.strictEqual(result.count, 1);
            const [init, post] = server.calls;
            assert.strictEqual(init.method, 'GET');
            assert.strictEqual(post.method, 'POST');
            assert.strictEqual(post.headers['x-auth-token'], 'token-1');
            assert.deepEqual(post.body.searchTerms, ['fixture', 'quest']);
            assert.deepEqual(post.body.searchOptions.games.platform, { mode: 'include', values: [] });
            assert.strictEqual(post.body.useCache, true);
            // same browser for both requests
            assert.strictEqual(init.headers['User-Agent'], post.headers['User-Agent']);
        }
        finally {
            server.restore();
        }
    }));
    it('reuses the token for later searches', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer();
        try {
            const hltb = new hltbsearch_1.HltbSearch();
            yield hltb.search(['a']);
            yield hltb.search(['b']);
            assert.strictEqual(server.calls.filter(c => c.method === 'GET').length, 1);
        }
        finally {
            server.restore();
        }
    }));
    it('gets a new token and retries once when the server rejects it', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer({ rejectFirstToken: true });
        try {
            const result = yield new hltbsearch_1.HltbSearch().search(['a']);
            assert.strictEqual(result.count, 1);
            const posts = server.calls.filter(c => c.method === 'POST');
            assert.strictEqual(posts.length, 2);
            assert.strictEqual(posts[1].headers['x-auth-token'], 'token-2');
        }
        finally {
            server.restore();
        }
    }));
    it('maps search results to HowLongToBeatEntry', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer();
        try {
            const [entry] = yield new howlongtobeat_1.HowLongToBeatService().search('Fixture Quest');
            assert.strictEqual(entry.id, '10001');
            assert.strictEqual(entry.name, 'Fixture Quest');
            assert.deepEqual(entry.platforms, ['PC', 'Nintendo Switch']);
            assert.strictEqual(entry.imageUrl, 'https://howlongtobeat.com/games/10001_Fixture_Quest.jpg');
            assert.strictEqual(entry.gameplayMain, 10);
            assert.strictEqual(entry.gameplayMainExtra, 15.5);
            assert.strictEqual(entry.gameplayCompletionist, 25);
            assert.strictEqual(entry.similarity, 1);
        }
        finally {
            server.restore();
        }
    }));
});
//# sourceMappingURL=hltbsearch.test.js.map