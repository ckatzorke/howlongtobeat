import * as chai from 'chai';

import { HltbSearch } from '../main/hltbsearch';
import { HowLongToBeatService } from '../main/howlongtobeat';

const axios: any = require('axios');
const assert = chai.assert;

/**
 * Replaces axios.get / axios.post with fakes that behave like howlongtobeat.com:
 * the init endpoint hands out tokens, the search endpoint accepts only a valid one.
 */
function fakeServer(options: { rejectFirstToken?: boolean } = {}) {
  const calls: any[] = [];
  let issued = 0;
  const valid = new Set<string>();
  const originalGet = axios.get;
  const originalPost = axios.post;

  axios.get = async (url: string, config: any) => {
    calls.push({ method: 'GET', url, headers: config.headers });
    if (url.startsWith(HltbSearch.INIT_URL + '?t=')) {
      issued++;
      const token = `token-${issued}`;
      if (!(options.rejectFirstToken && issued === 1)) {
        valid.add(token);
      }
      return { data: { token } };
    }
    throw new Error('unexpected GET ' + url);
  };

  axios.post = async (url: string, body: any, config: any) => {
    calls.push({ method: 'POST', url, body, headers: config.headers });
    if (url !== HltbSearch.SEARCH_URL) {
      throw new Error('unexpected POST ' + url);
    }
    if (!valid.has(config.headers['x-auth-token'])) {
      const error: any = new Error('Request failed with status code 403');
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
  };

  return {
    calls,
    restore: () => { axios.get = originalGet; axios.post = originalPost; }
  };
}

describe('Testing HltbSearch token flow (no network)', () => {

  it('fetches a token, sends it as x-auth-token and posts the new payload', async () => {
    const server = fakeServer();
    try {
      const result = await new HltbSearch().search(['fixture', 'quest']);
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
    } finally {
      server.restore();
    }
  });

  it('reuses the token for later searches', async () => {
    const server = fakeServer();
    try {
      const hltb = new HltbSearch();
      await hltb.search(['a']);
      await hltb.search(['b']);
      assert.strictEqual(server.calls.filter(c => c.method === 'GET').length, 1);
    } finally {
      server.restore();
    }
  });

  it('gets a new token and retries once when the server rejects it', async () => {
    const server = fakeServer({ rejectFirstToken: true });
    try {
      const result = await new HltbSearch().search(['a']);
      assert.strictEqual(result.count, 1);
      const posts = server.calls.filter(c => c.method === 'POST');
      assert.strictEqual(posts.length, 2);
      assert.strictEqual(posts[1].headers['x-auth-token'], 'token-2');
    } finally {
      server.restore();
    }
  });

  it('maps search results to HowLongToBeatEntry', async () => {
    const server = fakeServer();
    try {
      const [entry] = await new HowLongToBeatService().search('Fixture Quest');
      assert.strictEqual(entry.id, '10001');
      assert.strictEqual(entry.name, 'Fixture Quest');
      assert.deepEqual(entry.platforms, ['PC', 'Nintendo Switch']);
      assert.strictEqual(entry.imageUrl, 'https://howlongtobeat.com/games/10001_Fixture_Quest.jpg');
      assert.strictEqual(entry.gameplayMain, 10);
      assert.strictEqual(entry.gameplayMainExtra, 15.5);
      assert.strictEqual(entry.gameplayCompletionist, 25);
      assert.strictEqual(entry.similarity, 1);
    } finally {
      server.restore();
    }
  });
});
