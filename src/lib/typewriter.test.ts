import { describe, expect, it } from 'vitest'
import { getTypewriterText } from './typewriter'

describe('getTypewriterText', () => {
  it('reveals a reply one character window at a time', () => {
    expect(getTypewriterText('Probability signal', 0)).toBe('')
    expect(getTypewriterText('Probability signal', 11)).toBe('Probability')
    expect(getTypewriterText('Probability signal', 99)).toBe(
      'Probability signal',
    )
  })
})
