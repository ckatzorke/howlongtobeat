const request: any = require('request');
const UserAgent: any = require('user-agents');

/**
 * Takes care about the http connection and response handling
 */
export class HtmlScraper {

  async detailHtml(url: string): Promise<string> {
    let result: Promise<string> = new Promise<string>((resolve, reject) => {
      request.get(url, {
          followRedirect: false,
          headers: { 
            'User-Agent': new UserAgent().toString()
          }
        }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(`Got non-200 status code from howlongtobeat.com [${response.statusCode}]
            ${JSON.stringify(response)}
          `));
        } else {
          resolve(body);
        }
      });
    });
    return result;
  }

  async search(query: string, url: string): Promise<string> {
    let result: Promise<string> = new Promise<string>((resolve, reject) => {
      request.post(url, {
        qs: {
          page: 1
        },
        form: {
          'queryString': query,
          't': 'games',
          'sorthead': 'popular',
          'sortd': 'Normal Order',
          'plat': '',
          'length_type': 'main',
          'length_min': '',
          'length_max': '',
          'detail': '0'
        },
        headers: { 
          'Content-type': 'application/x-www-form-urlencoded', 
          'User-Agent': new UserAgent().toString()
        }
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(`Got non-200 status code from howlongtobeat.com [${response.statusCode}]
          ${JSON.stringify(response)}
          `));
        } else {
          resolve(body);
        }
      });
    });
    return result;
  }

}
