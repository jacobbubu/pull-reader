import Reader from '../src'
import * as pull from 'pull-stream'
import * as crypto from 'crypto'
import split from '@jacobbubu/pull-randomly-split'

const bytes = crypto.randomBytes(64)
const reader = Reader()
pull(pull.values([bytes]), split(), reader)
reader.read(32, (_, data) => {
  console.log('---1', data)
  console.log('---2', bytes)
})
