import { describe, expect, it } from 'vitest'
import { formatDeltaMinutes, formatMinutesOnly, formatUtcMinutes, parseMinutesOrTime, parseUtcMinutes } from './format'

describe('formatUtcMinutes', () => {
  it('formats as zero-padded HH:MM', () => {
    expect(formatUtcMinutes(5)).toBe('00:05')
    expect(formatUtcMinutes(9 * 60 + 5)).toBe('09:05')
    expect(formatUtcMinutes(23 * 60 + 59)).toBe('23:59')
  })

  it('wraps values past midnight', () => {
    expect(formatUtcMinutes(24 * 60 + 10)).toBe('00:10')
  })

  it('wraps negative values', () => {
    expect(formatUtcMinutes(-10)).toBe('23:50')
  })
})

describe('parseUtcMinutes', () => {
  it('parses HH:MM into minutes since midnight', () => {
    expect(parseUtcMinutes('09:05')).toBe(9 * 60 + 5)
    expect(parseUtcMinutes('23:59')).toBe(23 * 60 + 59)
    expect(parseUtcMinutes('0:00')).toBe(0)
  })

  it('returns NaN for malformed input', () => {
    expect(parseUtcMinutes('25:00')).toBeNaN()
    expect(parseUtcMinutes('12:60')).toBeNaN()
    expect(parseUtcMinutes('not a time')).toBeNaN()
  })
})

describe('formatMinutesOnly', () => {
  it('formats just the minute-within-the-hour, zero-padded', () => {
    expect(formatMinutesOnly(8 * 60 + 21)).toBe('21')
    expect(formatMinutesOnly(8 * 60 + 5)).toBe('05')
    expect(formatMinutesOnly(0)).toBe('00')
  })

  it('wraps negative values', () => {
    expect(formatMinutesOnly(-5)).toBe('55')
  })
})

describe('parseMinutesOrTime', () => {
  it('resolves a bare minute value to the anchor hour when unambiguous', () => {
    // Anchor 08:15, entering "21" should land on 08:21 (same hour, closer than 07:21/09:21).
    expect(parseMinutesOrTime('21', 8 * 60 + 15)).toBe(8 * 60 + 21)
  })

  it('rolls over to the next hour when the minute value is smaller than the anchor', () => {
    // Anchor 08:55, entering "03" is closer to 09:03 than 08:03 or 07:03.
    expect(parseMinutesOrTime('03', 8 * 60 + 55)).toBe(9 * 60 + 3)
  })

  it('rolls back to the previous hour when that is closer', () => {
    // Anchor 09:02, entering "58" is closer to 08:58 than 09:58.
    expect(parseMinutesOrTime('58', 9 * 60 + 2)).toBe(8 * 60 + 58)
  })

  it('still accepts a full HH:MM entry', () => {
    expect(parseMinutesOrTime('14:07', 8 * 60)).toBe(14 * 60 + 7)
  })

  it('returns NaN for an out-of-range bare value or garbage input', () => {
    expect(parseMinutesOrTime('60', 8 * 60)).toBeNaN()
    expect(parseMinutesOrTime('abc', 8 * 60)).toBeNaN()
  })
})

describe('formatDeltaMinutes', () => {
  it('prefixes positive deltas with +', () => {
    expect(formatDeltaMinutes(3)).toBe('+3')
  })

  it('prefixes negative deltas with a real minus sign', () => {
    expect(formatDeltaMinutes(-2)).toBe('−2')
  })

  it('shows ±0 for no delta', () => {
    expect(formatDeltaMinutes(0)).toBe('±0')
  })
})
