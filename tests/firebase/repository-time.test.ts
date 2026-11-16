import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { nextTimestampAfter } from '../../src/firebase/repository'

describe('Firestore case timestamps', () => {
  it('strictly advances beyond an existing future timestamp', () => {
    const previous = Timestamp.fromMillis(Date.now() + 60_000)
    expect(nextTimestampAfter(previous).toMillis()).toBe(previous.toMillis() + 1)
  })
})
