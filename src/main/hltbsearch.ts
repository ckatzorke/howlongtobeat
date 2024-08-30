const axios: any = require("axios");
const UserAgent: any = require("user-agents");
const cheerio: any = require("cheerio");

/**
 * Takes care about the http connection and response handling
 */
export class HltbSearch {
  public static BASE_URL: string = "https://howlongtobeat.com/";
  public static DETAIL_URL: string = `${HltbSearch.BASE_URL}game?id=`;
  public static SEARCH_URL: string = `${HltbSearch.BASE_URL}api/search/`;
  public static IMAGE_URL: string = `${HltbSearch.BASE_URL}games/`;

  private searchKey: string;

  private static readonly SEARCH_KEY_PATTERN =
    /"\/api\/search\/".concat\("([a-zA-Z0-9]+)"\)/g;

  payload: any = {
    searchType: "games",
    searchTerms: [],
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: {
          min: 0,
          max: 0,
        },
        gameplay: {
          perspective: "",
          flow: "",
          genre: "",
        },
        modifier: "",
      },
      users: {
        sortCategory: "postcount",
      },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
  };

  async detailHtml(gameId: string, signal?: AbortSignal): Promise<string> {
    try {
      let result = await axios
        .get(`${HltbSearch.DETAIL_URL}${gameId}`, {
          headers: {
            "User-Agent": new UserAgent().toString(),
            origin: "https://howlongtobeat.com",
            referer: "https://howlongtobeat.com",
          },
          timeout: 20000,
          signal,
        })
        .catch((e) => {
          throw e;
        });
      return result.data;
    } catch (error) {
      if (error) {
        throw new Error(error);
      } else if (error.response.status !== 200) {
        throw new Error(`Got non-200 status code from howlongtobeat.com [${
          error.response.status
        }]
          ${JSON.stringify(error.response)}
        `);
      }
    }
  }

  async search(query: Array<string>, signal?: AbortSignal): Promise<any> {
    // Use built-in javascript URLSearchParams as a drop-in replacement to create axios.post required data param
    let search = { ...this.payload };
    search.searchTerms = query;
    try {
      if (!this.searchKey) {
        this.searchKey = await this.getSearchKey();
      }

      const searchUrlWithKey = HltbSearch.SEARCH_URL + this.searchKey;

      let result = await axios.post(searchUrlWithKey, search, {
        headers: {
          "User-Agent": new UserAgent().toString(),
          "content-type": "application/json",
          origin: "https://howlongtobeat.com/",
          referer: "https://howlongtobeat.com/",
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
        throw new Error(`Got non-200 status code from howlongtobeat.com [${
          error.response.status
        }]
          ${JSON.stringify(error.response)}
        `);
      }
    }
  }

  private async getSearchKey(
    checkAllScripts: boolean = false
  ): Promise<string> {
    const res = await axios.get(HltbSearch.BASE_URL, {
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
      const src = $(el).attr("src") as string;

      if (!checkAllScripts && !src.includes("_app-")) {
        continue;
      }

      const scriptUrl = HltbSearch.BASE_URL + src;

      try {
        const res = await axios.get(scriptUrl, {
          headers: {
            "User-Agent": new UserAgent().toString(),
            origin: "https://howlongtobeat.com",
            referer: "https://howlongtobeat.com",
          },
        });

        const scriptText = res.data;
        const matches = [...scriptText.matchAll(HltbSearch.SEARCH_KEY_PATTERN)];
        return matches[0][1];
      } catch (error) {
        continue;
      }
    }

    throw new Error("Could not find search key");
  }
}
