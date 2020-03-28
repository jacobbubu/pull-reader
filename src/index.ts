import pull, { SourceCallback } from 'pull-stream'
import { State } from './state'

function isInteger(i: number) {
  return Number.isFinite(i)
}

function isFunction(f: any) {
  return 'function' === typeof f
}

type DataType = any

// Wrap the original read
function maxDelay(rawRead: pull.Source<DataType>, delay: number) {
  if (delay === 0) {
    return rawRead
  }
  const delayedRead: pull.Source<DataType> = (endOrError, cb) => {
    const timer = setTimeout(() => {
      const err = new Error('pull-reader: read exceeded timeout')
      // When timed-out, we abort the upstream and then notify the downstream
      rawRead(err, () => cb(err))
    }, delay)
    rawRead(endOrError, function (err, value) {
      // Called-back before timeout
      clearTimeout(timer)
      cb(err, value)
    })
  }
  return delayedRead
}

type TaskCallback = pull.SourceCallback<DataType>

interface Task {
  length?: number
  cb: pull.SourceCallback<DataType>
}

export default function (timeout: number = 0) {
  // requestQueue stores cached request from downstream
  const requestQueue: Task[] = []
  let rawRead: pull.Source<DataType>
  let readTimed: pull.Source<DataType>

  // Reading used as a lock to prevent reading the source at the same time
  let reading = false
  let ended: pull.EndOrError
  let streaming = false
  let abort: pull.Abort

  // State stores cached data from upstream
  const state = new State()

  function drain() {
    while (requestQueue.length > 0) {
      if (!requestQueue[0].length && state.has(1)) {
        requestQueue.shift()!.cb(null, state.get())
      } else if (state.has(requestQueue[0].length)) {
        // If cached result meets first requirement
        const next = requestQueue.shift()!
        next.cb(null, state.get(next.length))
      } else if (
        ended === true &&
        requestQueue[0].length &&
        state.length < requestQueue[0].length
      ) {
        // When the end happens before the cache meets the requirements,
        // we give out an accurate error message
        const msg = 'stream ended with:' + state.length + ' but wanted:' + requestQueue[0].length
        requestQueue.shift()!.cb(new Error(msg))
      } else if (ended) {
        requestQueue.shift()!.cb(ended)
      } else {
        return requestQueue.length > 0
      }
    }
    // Always read a little data
    return requestQueue.length || !state.has(1) || abort
  }

  // run drain-read loop
  function more() {
    const drained = drain()
    if (drained && !reading) {
      if (rawRead && !reading && !streaming) {
        reading = true
        readTimed(null, (err, data) => {
          reading = false
          if (err) {
            // If the upstream request terminates, then we drain the cache.
            ended = err
            return drain()
          }
          // Otherwise, we cache the data first and then try to drain the cache again
          state.add(data)
          more()
        })
      }
    }
  }

  // As a sink, we've got a original read function as a data source
  function reader(read: pull.Source<DataType>) {
    if (abort) {
      while (requestQueue.length > 0) {
        requestQueue.shift()!.cb(abort)
      }
      return
    }
    readTimed = maxDelay(read, timeout)
    rawRead = read
    more()
  }

  reader.abort = function (err?: pull.Abort, cb?: TaskCallback) {
    abort = err || true
    if (rawRead) {
      reading = true
      rawRead(abort, function () {
        // Clear all previous requests
        while (requestQueue.length) {
          requestQueue.shift()!.cb(abort)
        }
        cb?.(abort)
      })
    } else {
      cb?.(null)
    }
  }

  function read(len: number | null, cb: TaskCallback): void
  function read(len: number | null, _timeout: number | null, cb: TaskCallback): void
  // No callback function means entering stream mode (be a source)
  function read(): pull.Source<DataType>
  function read(len: number | null, _timeout?: number): pull.Source<DataType>
  function read(
    len?: number | null,
    _timeout?: number | TaskCallback | null,
    cb?: TaskCallback
  ): pull.Source<DataType> | void {
    let normalizedTimeout: number
    if (isFunction(_timeout)) {
      cb = (_timeout as any) as TaskCallback
      normalizedTimeout = timeout
    } else {
      normalizedTimeout = (_timeout as number | undefined) ?? timeout
    }
    if (isFunction(cb)) {
      requestQueue.push({ length: isInteger(len!) ? len! : undefined, cb: cb! })
      more()
    } else {
      // Switch into streaming mode for the rest of the stream.
      streaming = true
      // Wait for the current read to complete
      return function (abort: pull.Abort, cb: pull.SourceCallback<Buffer>) {
        // If there is anything still in the requestQueue,
        if (reading || state.has(1)) {
          if (abort) {
            return rawRead(abort, cb)
          }
          requestQueue.push({ cb })
          more()
        } else {
          maxDelay(rawRead, normalizedTimeout)(abort, function (err, data) {
            cb(err, data)
          })
        }
      }
    }
  }
  reader.read = read
  return reader
}
