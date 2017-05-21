const unirest: any = require('unirest');

/**
 * Takes care about the http connection and response handling
 */
export class HtmlScraper {

  async detailHtml(url: string): Promise<string> {
    let result: Promise<string> = new Promise<string>((resolve, reject) => {
      unirest.get(url).followRedirect(false).end((response) => {
        if (response && response.status === 200 && response.body) {
          resolve(response.body);
        } else {
          reject(new Error('error occurred!'));
        }
      });
    });
    return result;
  }

  async search(query: string, url: string): Promise<string> {
    let result: Promise<string> = new Promise<string>((resolve, reject) => {
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
          } else {
            reject(new Error('error occurred!'));
          }
        });
    });
    return result;
  }

}
