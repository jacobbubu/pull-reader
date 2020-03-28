# @jacobbubu/pull-reader

[![Build Status](https://travis-ci.org/jacobbubu/pull-reader.svg)](https://travis-ci.org/jacobbubu/pull-reader)
[![Coverage Status](https://coveralls.io/repos/github/jacobbubu/pull-reader/badge.svg)](https://coveralls.io/github/jacobbubu/pull-reader)
[![npm](https://img.shields.io/npm/v/@jacobbubu/pull-reader.svg)](https://www.npmjs.com/package/@jacobbubu/pull-reader/)

> Rewritten [pull-reader](https://github.com/dominictarr/pull-reader) in TypeScript.

# pull-reader

read bytes from a binary pull-stream


## example

``` js
import Reader from '@jacobbubu/pull-reader'
import File from '@jacobbubu/pull-file'
const reader = Reader(1000) // 1 second timeout, abort upstream if read takes longer than this.

pull(
  File('./package.json'),
  reader
)

// Read the first byte of a file
reader.read(1, function (err, data) {
  console.log(data.toString()) // => {
})
```
