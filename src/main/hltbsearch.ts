const axios: any = require('axios');
const UserAgent: any = require('user-agents');
const cheerio = require('cheerio');

export type SearchOptions = {
  year: number
} | {
  minYear: number,
  maxYear: number
};

/**
 * Takes care about the http connection and response handling
 */
export class HltbSearch {
  public static BASE_URL: string = 'https://howlongtobeat.com/';
  public static DETAIL_URL: string = `${HltbSearch.BASE_URL}game?id=`;
  public static BASE_SEARCH_URL: string = `${HltbSearch.BASE_URL}api/search`;
  public static IMAGE_URL: string = `${HltbSearch.BASE_URL}games/`;

  payload: any = {
    "searchType": "games",
    "searchTerms": [

    ],
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
        "rangeYear": {
          "min": null,
          "max": null
        },
        "gameplay": {
          "perspective": "",
          "flow": "",
          "genre": ""
        },
        "modifier": ""
      },
      "users": {
        "sortCategory": "postcount"
      },
      "filter": "",
      "sort": 0,
      "randomizer": 0
    }
  }

  async detailHtml(gameId: string, signal?: AbortSignal): Promise<string> {
    try {
      let result =
        await axios.get(`${HltbSearch.DETAIL_URL}${gameId}`, {
          headers: {
            'User-Agent': new UserAgent().toString(),
            'origin': 'https://howlongtobeat.com',
            'referer': 'https://howlongtobeat.com'
          },
          timeout: 20000,
          signal,
        }).catch(e => { throw e; });
      return result.data;
    } catch (error) {
      if (error) {
        throw new Error(error);
      } else if (error.response.status !== 200) {
        throw new Error(`Got non-200 status code from howlongtobeat.com [${error.response.status}]
          ${JSON.stringify(error.response)}
        `);
      }
    }
  }
  async search(query: Array<string>, signal?: AbortSignal): Promise<any> {
    return this.searchWithOptions(query, null, signal);
  }

  async searchWithOptions(query: Array<string>, searchOptions?: SearchOptions, signal?: AbortSignal): Promise<any> {
    // Use built-in javascript URLSearchOptions as a drop-in replacement to create axios.post required data param
    let search = { ...this.payload };
    search.searchTerms = query;
    if (searchOptions != null) {
      if ('year' in searchOptions) {
        search.searchOptions.games.rangeYear.min = searchOptions.year;
      }
      else if ('minYear' in searchOptions && 'maxYear' in searchOptions) {
        search.searchOptions.games.rangeYear.min = searchOptions.minYear;
        search.searchOptions.games.rangeYear.max = searchOptions.maxYear;
      }
    }
    try {
      let searchURLAppendix = await this.getSearchURLAppendix(false);
      if (searchURLAppendix === null ) {
        searchURLAppendix = await this.getSearchURLAppendix(true);
      }
        let result =
        await axios.post(HltbSearch.BASE_SEARCH_URL + "/" + searchURLAppendix, search, {
          headers: {
            'User-Agent': new UserAgent().toString(),
            'content-type': 'application/json',
            'origin': 'https://howlongtobeat.com/',
            'referer': 'https://howlongtobeat.com/'
          },
          timeout: 20000,
          signal,
        });
      // console.log('Result', JSON.stringify(result.data));
      return result.data;
    } catch (error) {
      if (error) {
        throw new Error(error);
      } else if (error.response.status !== 200) {
        throw new Error(`Got non-200 status code from howlongtobeat.com [${error.response.status}]
          ${JSON.stringify(error.response)}
        `);
      }
    }
  }

  // written based on https://github.com/ScrappyCocco/HowLongToBeat-PythonAPI/pull/26
  async getSearchURLAppendix(parseAllScripts: boolean): Promise<string | null> {
    try {
      const resp = await axios.get(HltbSearch.BASE_URL, {
        headers: {
          'User-Agent': new UserAgent().toString(),
          'origin': 'https://howlongtobeat.com',
          'referer': 'https://howlongtobeat.com'
        },
      });

      if (resp.status === 200 && resp.data) {
        // Parse the HTML content using cheerio
        const $ = cheerio.load(resp.data);
        const scripts = $('script[src]');
        let matchingScripts: string[];

        if (parseAllScripts) {
          matchingScripts = scripts.map((_, script) => $(script).attr('src')).get() as string[];
        } else {
          matchingScripts = scripts
            .map((_, script) => $(script).attr('src'))
            .get()
            .filter(src => src && src.includes('_app-')) as string[];
        }

        for (let scriptUrl of matchingScripts) {
          scriptUrl = HltbSearch.BASE_URL + scriptUrl;
          const scriptResp = await axios.get(scriptUrl, {
            headers: {
              'User-Agent': new UserAgent().toString(),
              'origin': 'https://howlongtobeat.com',
              'referer': 'https://howlongtobeat.com'
            },

          });
          if (scriptResp.status === 200 && scriptResp.data) {
            const pattern = /"\/api\/search\/".concat\("([a-zA-Z0-9]+)"\)/g;
            const matches = scriptResp.data.match(pattern);

            if (matches) {
              return matches.map(match => {
                const regex = /"\/api\/search\/".concat\("([a-zA-Z0-9]+)"\)/;
                const result = regex.exec(match);
                return result ? result[1] : null;
              }).find(Boolean); // Return first non-null match
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in sending request:', error);
    }
    return null;
  }
}

