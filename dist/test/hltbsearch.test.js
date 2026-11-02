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
const BASE = 'https://howlongtobeat.com';
/** a chunk that POSTs somewhere unrelated: must never be taken for the search endpoint */
const ERROR_CHUNK = 'let r=async e=>{await fetch("/api/error",{method:"POST",body:JSON.stringify(e)})};';
/** a chunk shaped like the site's search code */
function searchChunk(path) {
    return 'er=async()=>{let e=await fetch(`' + path + '/init?t=${Date.now()}`);if(e.ok){let t=await e.json();return t}};' +
        'es=async e=>{let a=await fetch("' + path + '",{method:"POST",headers:{"Content-Type":"application/json","x-auth-token":e.token},body:JSON.stringify(q)})};';
}
function homePage(chunks) {
    return '<html><head>' + chunks.map(c => `<script src="/_next/static/chunks/${c}.js" async=""></script>`).join('') +
        '<script src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script></head><body></body></html>';
}
/**
 * Replaces axios.get / axios.post with fakes that behave like howlongtobeat.com.
 */
function fakeServer(options = {}) {
    const path = options.path || '/api/search/site';
    const advertised = options.advertisedPath || path;
    const calls = [];
    let issued = 0;
    const valid = new Set();
    const originalGet = axios.get;
    const originalPost = axios.post;
    const chunks = { 'aaa111': ERROR_CHUNK, 'bbb222': searchChunk(advertised) };
    axios.get = (url, config) => __awaiter(this, void 0, void 0, function* () {
        calls.push({ method: 'GET', url, headers: config.headers });
        if (url === BASE + '/') {
            if (options.homeFails) {
                const error = new Error('Request failed with status code 503');
                error.response = { status: 503 };
                throw error;
            }
            return { data: homePage(Object.keys(chunks)) };
        }
        const chunk = url.match(/\/_next\/static\/chunks\/(\w+)\.js$/);
        if (chunk) {
            return { data: chunks[chunk[1]] };
        }
        if (url.startsWith(BASE + path + '/init?t=')) {
            issued++;
            const token = `token-${issued}`;
            if (!(options.rejectFirstToken && issued === 1)) {
                valid.add(token);
            }
            return { data: Object.assign({ token }, (options.initExtra || {})) };
        }
        const error = new Error('Request failed with status code 404');
        error.response = { status: 404 };
        throw error;
    });
    axios.post = (url, body, config) => __awaiter(this, void 0, void 0, function* () {
        calls.push({ method: 'POST', url, body, headers: config.headers });
        if (url !== BASE + path) {
            const error = new Error('Request failed with status code 404');
            error.response = { status: 404 };
            throw error;
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
        gets: () => calls.filter(c => c.method === 'GET').map(c => c.url),
        posts: () => calls.filter(c => c.method === 'POST'),
        restore: () => { axios.get = originalGet; axios.post = originalPost; }
    };
}
describe('Testing HltbSearch endpoint discovery (no network)', () => {
    it('takes the POST endpoint whose script also calls its /init, ignoring other POSTs', () => {
        assert.isNull(hltbsearch_1.HltbSearch.findSearchPath(ERROR_CHUNK));
        assert.deepEqual(hltbsearch_1.HltbSearch.findSearchPath(searchChunk('/api/search/site')), { path: '/api/search/site', confidence: 'strong' });
        assert.deepEqual(hltbsearch_1.HltbSearch.findSearchPath(ERROR_CHUNK + searchChunk('/api/finder/v2')), { path: '/api/finder/v2', confidence: 'strong' });
    });
    it('accepts a POST endpoint without /init only as a weak match, when the script sends x-auth-token', () => {
        const js = 'fetch("/api/find",{method:"POST",headers:{"x-auth-token":t}})';
        assert.deepEqual(hltbsearch_1.HltbSearch.findSearchPath(js), { path: '/api/find', confidence: 'weak' });
    });
    it('lists only Next.js chunks from the home page', () => {
        assert.deepEqual(hltbsearch_1.HltbSearch.findChunkScripts(homePage(['a1', 'b2'])), ['/_next/static/chunks/a1.js', '/_next/static/chunks/b2.js']);
    });
    it('reads the token and an optional honeypot pair from /init', () => {
        assert.deepEqual(hltbsearch_1.HltbSearch.parseAuth({ token: 't' }), { token: 't' });
        assert.deepEqual(hltbsearch_1.HltbSearch.parseAuth({ token: 't', hpKey: 'abc', hpVal: '123' }), { token: 't', hpKey: 'abc', hpVal: '123' });
        assert.isNull(hltbsearch_1.HltbSearch.parseAuth({}));
    });
});
describe('Testing HltbSearch search flow (no network)', () => {
    beforeEach(() => hltbsearch_1.HltbSearch.resetDiscovery());
    it('discovers the endpoint, gets a token and posts the search with it', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer();
        try {
            const result = yield new hltbsearch_1.HltbSearch().search(['fixture', 'quest']);
            assert.strictEqual(result.count, 1);
            assert.include(server.gets(), BASE + '/');
            const post = server.posts()[0];
            assert.strictEqual(post.url, BASE + '/api/search/site');
            assert.strictEqual(post.headers['x-auth-token'], 'token-1');
            assert.isUndefined(post.headers['x-hp-key']);
            assert.deepEqual(post.body.searchTerms, ['fixture', 'quest']);
            assert.deepEqual(post.body.searchOptions.games.platform, { mode: 'include', values: [] });
            assert.strictEqual(post.body.useCache, true);
            const userAgents = new Set(server.calls.map(c => c.headers['User-Agent']));
            assert.strictEqual(userAgents.size, 1);
        }
        finally {
            server.restore();
        }
    }));
    it('follows the site when the endpoint changes name', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer({ path: '/api/finder/v2' });
        try {
            yield new hltbsearch_1.HltbSearch().search(['a']);
            assert.strictEqual(server.posts()[0].url, BASE + '/api/finder/v2');
        }
        finally {
            server.restore();
        }
    }));
    it('reuses endpoint and token for later searches, across instances for the endpoint', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer();
        try {
            const hltb = new hltbsearch_1.HltbSearch();
            yield hltb.search(['a']);
            yield hltb.search(['b']);
            yield new hltbsearch_1.HltbSearch().search(['c']);
            assert.strictEqual(server.gets().filter(u => u === BASE + '/').length, 1);
            assert.strictEqual(server.gets().filter(u => u.indexOf('/init?t=') > -1).length, 2);
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
            assert.strictEqual(server.posts().length, 2);
            assert.strictEqual(server.posts()[1].headers['x-auth-token'], 'token-2');
        }
        finally {
            server.restore();
        }
    }));
    it('sends the honeypot pair as headers and in the body when /init returns one', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer({ initExtra: { hpKey: 'abc123', hpVal: 'xyz' } });
        try {
            yield new hltbsearch_1.HltbSearch().search(['a']);
            const post = server.posts()[0];
            assert.strictEqual(post.headers['x-hp-key'], 'abc123');
            assert.strictEqual(post.headers['x-hp-val'], 'xyz');
            assert.strictEqual(post.body['abc123'], 'xyz');
        }
        finally {
            server.restore();
        }
    }));
    it('falls back to the last known endpoint when the home page cannot be read', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer({ homeFails: true });
        try {
            const result = yield new hltbsearch_1.HltbSearch().search(['a']);
            assert.strictEqual(result.count, 1);
            assert.strictEqual(server.posts()[0].url, BASE + hltbsearch_1.HltbSearch.FALLBACK_SEARCH_PATH);
        }
        finally {
            server.restore();
        }
    }));
    it('discovers again and retries when a cached endpoint has gone away (404)', () => __awaiter(this, void 0, void 0, function* () {
        const old = fakeServer();
        try {
            yield new hltbsearch_1.HltbSearch().search(['a']);
        }
        finally {
            old.restore();
        }
        // the site moves to a new endpoint while the old one is still cached
        const server = fakeServer({ path: '/api/finder/v2' });
        try {
            const result = yield new hltbsearch_1.HltbSearch().search(['b']);
            assert.strictEqual(result.count, 1);
            // the cached endpoint's /init answers 404, which triggers a new discovery
            const gets = server.gets().map(u => u.replace(/\?t=\d+$/, ''));
            assert.deepEqual(gets.filter(u => u.endsWith('/init')), [BASE + '/api/search/site/init', BASE + '/api/finder/v2/init']);
            assert.include(gets, BASE + '/');
            assert.deepEqual(server.posts().map(p => p.url), [BASE + '/api/finder/v2']);
        }
        finally {
            server.restore();
        }
    }));
    it('fails with a readable status when the retry fails too', () => __awaiter(this, void 0, void 0, function* () {
        const server = fakeServer({ path: '/api/finder/v2', advertisedPath: '/api/gone' });
        try {
            yield new hltbsearch_1.HltbSearch().search(['a']);
            assert.fail('should have thrown');
        }
        catch (e) {
            assert.include(e.message, 'non-200');
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