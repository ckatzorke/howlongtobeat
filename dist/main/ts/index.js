"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const htmlscraper_1 = require("./htmlscraper");
new htmlscraper_1.HtmlScraper().search('Dorkyksk', 'https://howlongtobeat.com/search_main.php').then((body) => console.log(body));
