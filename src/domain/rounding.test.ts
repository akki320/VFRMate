import { describe, expect, it } from 'vitest'
import { normalizeCourseDeg, roundDistanceNm, roundMassKg } from './rounding'

describe('normalizeCourseDeg', () => {
  it('wraps values >= 360 down into 0–359', () => {
    expect(normalizeCourseDeg(360)).toBe(0)
    expect(normalizeCourseDeg(365)).toBe(5)
  })

  it('wraps negative values up into 0–359', () => {
    expect(normalizeCourseDeg(-5)).toBe(355)
    expect(normalizeCourseDeg(-365)).toBe(355)
  })
})

describe('roundDistanceNm', () => {
  it('rounds to one decimal place', () => {
    expect(roundDistanceNm(12.34)).toBe(12.3)
    expect(roundDistanceNm(12.36)).toBe(12.4)
  })
})

describe('roundMassKg', () => {
  it('rounds to whole kilograms', () => {
    expect(roundMassKg(802.6)).toBe(803)
    expect(roundMassKg(802.4)).toBe(802)
  })
})
