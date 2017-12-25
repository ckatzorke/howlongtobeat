# Howlongtobeat API

![Latest Build Status](https://api.travis-ci.org/ckatzorke/howlongtobeat.svg?branch=master)
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

#### Add imports (javascript)

```javascript
let hltb = require('howlongtobeat');
let hltbService = new hltb.HowLongToBeatService();
```

#### Add imports (typescript)

```typescript
import { HowLongToBeatService, HowLongToBeatEntry } from 'howlongtobeat';

let hltbService = new HowLongToBeatService();
```


#### Searching for a game

```javascript
hltbService.search('Nioh').then(result => console.log(result));
```

search() will return a `Promise` with an `Array<HowLongToBeatEntry>`

#### Getting details for a game

```javascript
hltbService.detail('36936').then(result => console.log(result)).catch(e => console.error(e));
```

search() will return a `Promise` with an `HowLongToBeatEntry`. If the id is not known, an error is thrown, you should catch the Promise anyway.


## Known issues

### Errors

    DeprecationWarning: sys is deprecated. Use util instead.

This seems to come from either soupselect or unirest. Will look into it and at least open an issue.

### Missing features

- Currently only "Main Story" and "Completionist" times are parsed and set
- Error and Exception handling is almost not present, must be improved

## License

![WTFPL](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-4.png)

