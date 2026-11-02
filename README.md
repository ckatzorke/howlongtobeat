# Howlongtobeat API

[![Latest Build Status](https://api.travis-ci.org/ckatzorke/howlongtobeat.svg?branch=master)](https://travis-ci.org/ckatzorke/howlongtobeat)
[![npm version](https://badge.fury.io/js/howlongtobeat.svg)](https://badge.fury.io/js/howlongtobeat)
[![codecov](https://codecov.io/gh/ckatzorke/howlongtobeat/branch/master/graph/badge.svg)](https://codecov.io/gh/ckatzorke/howlongtobeat)

## About & Credits

[How long to beat](https://howlongtobeat.com/) provides information and data about games and how long it will take to finish them.

This library is a simple wrapper api to fetch data from [How long to beat](https://howlongtobeat.com/) (search and detail).
It is an awesome website and a great service, also heavily living from community data. Please check the website and [support](https://howlongtobeat.com/donate.php) if you like what they are doing.

## Usage

### Install the dependency

```javascript
npm install howlongtobeat --save
```

### Use in code

#### Add imports

* javascript

```javascript
let hltb = require('howlongtobeat');
let hltbService = new hltb.HowLongToBeatService();
```

* typescript

```typescript
import { HowLongToBeatService, HowLongToBeatEntry } from 'howlongtobeat';

let hltbService = new HowLongToBeatService();
```

#### Searching for a game

```javascript
hltbService.search('Nioh').then(result => console.log(result));
```

`search()` will return a `Promise` with an `Array<HowLongToBeatEntry>`

* Search response example:

```javascript
[ {
    id: '36936',
    name: 'Nioh',
    imageUrl: 'https://howlongtobeat.com/gameimages/36936_Nioh.jpg',
    timeLabels: [ [Array], [Array], [Array] ],
    gameplayMain: 34.5,
    gameplayMainExtra: 61,
    gameplayCompletionist: 93.5,
    similarity: 1,
    searchTerm: 'Nioh'
    },
    {
    id: '50419',
    name: 'Nioh: Complete Edition',
    imageUrl: 'https://howlongtobeat.com/gameimages/50419_Nioh_Complete_Edition.jpg',
    timeLabels: [ [Array], [Array], [Array] ],
    gameplayMain: 42,
    gameplayMainExtra: 84,
    gameplayCompletionist: 97,
    similarity: 0.18,
    searchTerm: 'Nioh'
    },
    ...
]
```

#### Getting details for a game

```javascript
hltbService.detail('36936').then(result => console.log(result)).catch(e => console.error(e));
```

The `detail()` method will return a `Promise` with an `HowLongToBeatEntry`. If the id is not known, an error is thrown, you should catch the Promise anyway.

* Detail response example:

```javascript
{
  id: '36936',
  name: 'Nioh',
  imageUrl: 'https://howlongtobeat.com/gameimages/36936_Nioh.jpg',
  timeLabels:
   [ [ 'gameplayMain', 'Main Story' ],
     [ 'gameplayMainExtra', 'Main + Extras' ],
     [ 'gameplayComplete', 'Completionist' ] ],
  gameplayMain: 34.5,
  gameplayMainExtra: 61,
  gameplayCompletionist: 93.5,
  similarity: 1,
  searchTerm: 'Nioh'
}
```

## Time Labels

HLTB has 7 differents ways to count games hours, here they are:

* Main Story
* Main + Extras
* Completionist
* Single-Player
* Solo
* Co-Op
* Vs.

Use the `timeLabels` attribute for mapping purposes

## How it talks to howlongtobeat.com

The site protects its search API and renames the endpoint from time to time
(`/api/search`, `/api/s/<key>`, `/api/find`, currently `/api/search/site`). To keep working across
those changes, a search:

1. **finds the endpoint** in the site's own JavaScript: it loads the home page and its
   `/_next/static/chunks/` scripts, and takes the path the code `POST`s to *and* calls `<path>/init` on
   (other POSTs, like `/api/error`, are ignored). The result is cached for an hour and shared by all
   instances; if it cannot be found, the last known endpoint is used.
2. **gets a token** from `GET <path>/init?t=<ms>`, cached for 5 minutes. If the response also carries a
   key/value pair (older versions of the site asked for it), it is sent back as `x-hp-key`/`x-hp-val`
   headers and inside the payload.
3. **searches** with `POST <path>` and the `x-auth-token` header.

If the search is rejected (401/403) or the endpoint is gone (404/405), the endpoint and the token are
discovered again and the search is retried once.

Details (`detail()`) read the game data from the page's `__NEXT_DATA__` JSON (`/game/<id>`), which
needs no token.

## Known issues

### Missing features

* Error and Exception handling is almost not present, must be improved

## License

![WTFPL](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-4.png)
