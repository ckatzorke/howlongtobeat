import { HtmlScraper } from './htmlscraper';

new HtmlScraper().search('Dorkyksk', 'https://howlongtobeat.com/search_main.php').then((body) => console.log(body));
