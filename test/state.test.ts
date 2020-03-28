import * as crypto from 'crypto'
import { State } from '../src/state'

describe('state', () => {
  const bytes = crypto.randomBytes(64)

  it('invalid param', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    expect(() => {
      state.add((100 as unknown) as Buffer)
    }).toThrowError(/^data must be a buffer/)
  })

  it('read everything', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    state.add(bytes.slice(0, 32))
    expect(state.has(1)).toBeTruthy()
    expect(state.has(32)).toBeTruthy()
    expect(state.has(33)).toBeFalsy()
    state.add(bytes.slice(32, 64))
    expect(state.get(64)).toEqual(bytes)
  })

  it('read overlapping sections', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    state.add(bytes)
    expect(state.has(1)).toBeTruthy()

    expect(state.get(48)).toEqual(bytes.slice(0, 48))
    expect(state.get(16)).toEqual(bytes.slice(48, 64))
  })

  it('read multiple sections', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    state.add(bytes)
    expect(state.has(1)).toBeTruthy()

    expect(state.get(20)).toEqual(bytes.slice(0, 20))
    expect(state.get(16)).toEqual(bytes.slice(20, 36))
    expect(state.get(28)).toEqual(bytes.slice(36, 64))
  })

  it('read overlapping sections', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    state.add(bytes.slice(0, 32))
    state.add(bytes.slice(32, 64))
    expect(state.has(1)).toBeTruthy()

    expect(state.get(31)).toEqual(bytes.slice(0, 31))
    expect(state.get(33)).toEqual(bytes.slice(31, 64))
  })

  it('read overlapping sections', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    state.add(bytes.slice(0, 32))
    state.add(bytes.slice(32, 64))
    expect(state.has(1)).toBeTruthy()

    expect(state.get(33)).toEqual(bytes.slice(0, 33))
    expect(state.get(31)).toEqual(bytes.slice(33, 64))
  })

  it('get whatever is left', () => {
    const state = new State()
    expect(state.has(1)).toBeFalsy()
    state.add(bytes)
    expect(state.has(bytes.length)).toBeTruthy()

    const b = state.get()
    expect(b).toEqual(bytes)
  })
})
