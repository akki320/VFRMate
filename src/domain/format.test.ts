import { describe, expect, it } from 'vitest'
import { clockMinuteOnly, formatDeltaMinutes, formatHoursMinutes, formatUtcMinutes, parseUtcMinutes } from './format'

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

describe('formatHoursMinutes', () => {
  it('formats a plain minute count as H:MM', () => {
    expect(formatHoursMinutes(0)).toBe('0:00')
    expect(formatHoursMinutes(5)).toBe('0:05')
    expect(formatHoursMinutes(65)).toBe('1:05')
    expect(formatHoursMinutes(125)).toBe('2:05')
  })

  it('does not zero-pad the hour', () => {
    expect(formatHoursMinutes(600)).toBe('10:00')
  })

  it('formats a negative value with a leading minus', () => {
    expect(formatHoursMinutes(-65)).toBe('−1:05')
  })
})

describe('clockMinuteOnly', () => {
  it('shows the minute of the resulting clock time (ATD 15:15 + 1 min -> 16)', () => {
    expect(clockMinuteOnly(15 * 60 + 15, 1)).toBe('16')
  })

  it('wraps past the hour', () => {
    expect(clockMinuteOnly(15 * 60 + 15, 75)).toBe('30') // 15:15 + 75min = 16:30
  })

  it('zero-pads single-digit minutes', () => {
    expect(clockMinuteOnly(15 * 60, 6)).toBe('06')
  })

  it('wraps past midnight', () => {
    expect(clockMinuteOnly(23 * 60 + 50, 20)).toBe('10') // 23:50 + 20min = 00:10
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
