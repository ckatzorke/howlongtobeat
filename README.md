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

## Known issues

### Missing features

* Error and Exception handling is almost not present, must be improved

## License

![WTFPL](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-4.png)
