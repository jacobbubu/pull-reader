export class State {
  private _buffers: Buffer[] = []
  private _length = 0

  get length() {
    return this._length
  }

  add(data: Buffer) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('data must be a buffer, was: ' + JSON.stringify(data))
    }
    this._length = this._length + data.length
    this._buffers.push(data)
    return this
  }

  has(n?: number) {
    if (n === undefined) {
      return this._length > 0
    }
    return this._length >= n
  }

  get(n?: number) {
    let tmpLength: number
    if (n === undefined || n === this._length) {
      this._length = 0
      const tmpBuffer = this._buffers
      this._buffers = []
      if (tmpBuffer.length === 1) {
        return tmpBuffer[0]
      } else {
        return Buffer.concat(tmpBuffer)
      }
    } else if (this._buffers.length > 1 && n <= this._buffers[0].length) {
      tmpLength = this._buffers[0].length
      const buf = this._buffers[0].slice(0, n)
      if (n === tmpLength) {
        this._buffers.shift()
      } else {
        this._buffers[0] = this._buffers[0].slice(n, tmpLength)
      }
      this._length -= n
      return buf
    } else if (n < this._length) {
      const out: Buffer[] = []
      let len = 0

      while (len + this._buffers[0].length < n) {
        const b = this._buffers.shift()
        len += b!.length
        out.push(b!)
      }

      if (len < n) {
        out.push(this._buffers[0].slice(0, n - len))
        this._buffers[0] = this._buffers[0].slice(n - len, this._buffers[0].length)
        this._length = this._length - n
      }
      return Buffer.concat(out)
    } else {
      throw new Error('could not get ' + n + ' bytes')
    }
  }

  // just used for debugging...
  calcLength() {
    return this._buffers.reduce((sum, curr) => sum + curr.length, 0)
  }
}
