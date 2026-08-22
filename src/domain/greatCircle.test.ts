import { describe, expect, it } from 'vitest'
import { greatCircleBearingAndDistance } from './greatCircle'

describe('greatCircleBearingAndDistance', () => {
  it('gives TC 090 and ~60 NM for one degree of longitude east on the equator', () => {
    const result = greatCircleBearingAndDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })
    expect(result.tc).toBe(90)
    expect(result.distanceNm).toBeCloseTo(60.0, 0)
  })

  it('gives TC 270 for one degree of longitude west on the equator', () => {
    const result = greatCircleBearingAndDistance({ lat: 0, lon: 0 }, { lat: 0, lon: -1 })
    expect(result.tc).toBe(270)
  })

  it('gives TC 000 and ~60 NM for one degree of latitude north', () => {
    const result = greatCircleBearingAndDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })
    expect(result.tc).toBe(0)
    expect(result.distanceNm).toBeCloseTo(60.0, 0)
  })

  it('gives TC 180 for one degree of latitude south', () => {
    const result = greatCircleBearingAndDistance({ lat: 0, lon: 0 }, { lat: -1, lon: 0 })
    expect(result.tc).toBe(180)
  })

  it('returns 0 distance and a defined course for identical points', () => {
    const result = greatCircleBearingAndDistance({ lat: 50, lon: 8 }, { lat: 50, lon: 8 })
    expect(result.distanceNm).toBe(0)
    expect(Number.isNaN(result.tc)).toBe(false)
  })

  it('matches a realistic short GA leg (~25 NM) within rounding tolerance', () => {
    // Roughly Egelsbach (EDFE) to Reichelsheim (EDFY), ~25 NM south-east.
    const result = greatCircleBearingAndDistance(
      { lat: 49.9598, lon: 8.6435 },
      { lat: 49.6864, lon: 8.8332 },
    )
    expect(result.distanceNm).toBeGreaterThan(15)
    expect(result.distanceNm).toBeLessThan(22)
    expect(result.tc).toBeGreaterThan(140)
    expect(result.tc).toBeLessThan(200)
  })
})
