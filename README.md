# Cooperatio
[![Build Status](https://travis-ci.org/peterbartha/cooperatio.svg?branch=master)](https://travis-ci.org/peterbartha/cooperatio)

Cooperatio is a real-time collaboration framework written in TypeScript. Basically it is a little client-server library to allow concurrent editing of any kind of content via Operational Transformation.

The framework currently supports operational transforms on
- plain texts,
- arbitrary JSON objects.

## Building and testing
Download the sourcecode via SSH or HTTP and navigate inside the `cooperatio` folder. Install NPM dependencies with:
    
    $ npm install
    $ npm run build

Run the tests with:

    $ npm test

## Licence
Cooperatio framework is a redesigned, reimplemented and improved version of [ot.js](https://github.com/Operational-Transformation/ot.js) library ([MIT](https://github.com/Operational-Transformation/ot.js/blob/master/LICENSE) © [Tim Baumann](https://github.com/timjb)).
It also includes some basic functions from the [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch) library.

Licensed under the [MIT](https://github.com/peterbartha/cooperatio/blob/master/LICENSE) License.
