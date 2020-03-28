import Reader from '../src'
import * as pull from 'pull-stream'
import * as crypto from 'crypto'
import split from '@jacobbubu/pull-randomly-split'
import Hang from '@jacobbubu/pull-hang'

describe('basic', () => {
  const bytes = crypto.randomBytes(64)

  it('read once a stream', (done) => {
    const reader = Reader()
    pull(pull.values([bytes]), split(), reader)
    reader.read(32, (err, data) => {
      expect(err).toBeFalsy()
      expect(data).toEqual(bytes.slice(0, 32))
      done()
    })
  })

  it('read twice from a stream', (done) => {
    const reader = Reader()
    pull(pull.values([bytes]), split(), reader)
    reader.read(32, (err, data) => {
      expect(err).toBeFalsy()
      expect(data).toEqual(bytes.slice(0, 32))

      reader.read(16, (err, data) => {
        expect(err).toBeFalsy()
        expect(data).toEqual(bytes.slice(32, 48))
        done()
      })
    })
  })

  it('read whatever is there', (done) => {
    const reader = Reader()
    pull(pull.values([bytes]), split(), reader)
    reader.read(null, (err, data) => {
      expect(err).toBeFalsy()
      expect(data.length).toBeGreaterThan(0)
      done()
    })
  })

  it('read a stream', (done) => {
    const reader = Reader()
    pull(pull.values([bytes]), split(), reader)

    pull(
      reader.read(null) as pull.Source<Buffer>,
      pull.collect(function (err, data: Buffer[]) {
        expect(err).toBeFalsy()
        const _data = Buffer.concat(data)
        expect(_data.length).toBe(bytes.length)
        expect(_data).toEqual(bytes)
        done()
      })
    )
  })

  it('async read', (done) => {
    const reader = Reader()

    pull(pull.values([Buffer.from('hello there')]), reader)

    setTimeout(() => {
      reader.read(6, (_, hello) => {
        setTimeout(function () {
          reader.read(5, function (err, there) {
            if (err) {
              throw new Error('unexpected end')
            }
            expect(Buffer.concat([hello, there]).toString()).toEqual('hello there')
            done()
          })
        }, 10)
      })
    }, 10)
  })

  it('abort the stream', (done) => {
    const reader = Reader()
    pull(
      Hang(() => done()),
      reader
    )
    reader.abort()
  })

  it('abort the stream and a read', (done) => {
    const reader = Reader()
    const err = new Error('intended')

    pull(
      Hang(function () {
        done()
      }),
      reader
    )
    reader.read(32, (_err) => {
      expect(_err).toBe(err)
    })
    reader.read(32, (_err) => {
      expect(_err).toBe(err)
    })
    reader.read(32, (_err) => {
      expect(_err).toBe(err)
    })

    reader.abort(err, (_err) => {
      // All previous callbacks will be executed
      expect(_err).toBe(err)
    })
  })

  it('if streaming, the stream should abort', (done) => {
    const reader = Reader()
    const err = new Error('intended')

    pull(Hang(), reader)

    pull(
      reader.read(),
      pull.collect(function (_err) {
        expect(_err).toBe(err)
        done()
      })
    )
    reader.abort(err)
  })

  it('abort stream once in streaming mode', (done) => {
    const reader = Reader()
    const err = new Error('intended')

    pull(Hang(), reader)

    const read = reader.read()

    read(true, function (err) {
      expect(err).toBeTruthy()
      done()
    })
  })

  it('configurable timeout', (done) => {
    const reader = Reader(100)
    const start = Date.now()
    pull(Hang(), reader)

    pull(
      reader.read(),
      pull.collect(function (err) {
        expect(err).toBeTruthy()
        expect(Date.now()).toBeGreaterThan(start + 50)
        expect(Date.now()).toBeLessThan(start + 300)
        done()
      })
    )
  })

  it('timeout does not apply to the rest of the stream', (done) => {
    const reader = Reader(100)
    let once = false

    pull((_, cb) => {
      if (!once) {
        setTimeout(() => {
          once = true
          cb(null, Buffer.from('hello world'))
        }, 110)
      } else {
        cb(true)
      }
    }, reader)

    pull(
      reader.read(),
      pull.collect(function (err, ary) {
        expect(err).toBeFalsy()
        expect(Buffer.concat(ary).toString()).toBe('hello world')
        done()
      })
    )
  })

  it('overriding results in an error', (done) => {
    const reader = Reader(20e3)
    const corruptedBytes = crypto.randomBytes(10)

    pull(pull.values([corruptedBytes]), reader)

    reader.read(11, (_err) => {
      expect(_err).toBeInstanceOf(Error)
      expect((_err as Error).message).toMatch(/^stream ended with*/)
      done()
    })
  })

  it('overriding with multiple reads results in an error', (done) => {
    const reader = Reader(20e3)
    const corruptedBytes = crypto.randomBytes(10)

    pull(pull.values([corruptedBytes]), reader)

    reader.read(1, (_err) => {
      expect(_err).toBeFalsy()
      reader.read(100, (_err) => {
        expect((_err as Error).message).toMatch(/^stream ended with*/)
        done()
      })
    })
  })
})
