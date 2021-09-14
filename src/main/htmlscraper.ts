const axios: any = require('axios');
const UserAgent: any = require('user-agents');

/**
 * Takes care about the http connection and response handling
 */
export class HtmlScraper {

  async detailHtml(url: string): Promise<string> {
    try {
      let result = 
      	await axios.get(url, {
          followRedirect: false,
          headers: { 
            'User-Agent': new UserAgent().toString()
          },
          timeout: 20000,
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

  async search(query: string, url: string): Promise<string> {
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
    
    try {
      let result = 
        await axios.post(url, form, {
          qs: {
            page: 1
          },
          headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            'User-Agent': new UserAgent().toString()
          },
          timeout: 20000,
      });
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
}
