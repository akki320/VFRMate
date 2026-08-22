/**
 * Masse & Schwerpunkt: Moment- und Summenbildung sowie Point-in-Polygon-Prüfung
 * gegen die Schwerpunktgrenzen (CG-Envelope) des Musters.
 */
import type { Aircraft, MassBalance, MassMomentPoint } from './types'
import { roundMassKg } from './rounding'

export interface MassBalanceItem {
  label: string
  massKg: number
  armM: number
  momentKgM: number
}

export interface MassBalanceResult {
  items: MassBalanceItem[]
  totalMassKg: number
  totalMomentKgM: number
  /** Schwerpunktlage = Moment / Masse, in m. */
  cgM: number
  /** true, wenn (totalMassKg, totalMomentKgM) innerhalb des CG-Envelope liegt. */
  withinEnvelope: boolean
}

/** Berechnet Momente je Beladungsposition sowie Gesamtmasse, Gesamtmoment
 * und Schwerpunktlage, und prüft das Ergebnis gegen das CG-Envelope. */
export function computeMassBalance(aircraft: Aircraft, load: MassBalance): MassBalanceResult {
  const items: MassBalanceItem[] = [
    { label: 'Leermasse', massKg: aircraft.emptyMassKg, armM: 0, momentKgM: 0 },
    {
      label: 'Kraftstoff',
      massKg: load.usableFuelL * aircraft.fuelDensityKgPerL,
      armM: aircraft.arms.fuel,
      momentKgM: 0,
    },
    { label: 'Sitzreihe 1', massKg: load.seatRow1Kg, armM: aircraft.arms.seatRow1, momentKgM: 0 },
    { label: 'Sitzreihe 2', massKg: load.seatRow2Kg, armM: aircraft.arms.seatRow2, momentKgM: 0 },
    { label: 'Sitzreihe 3', massKg: load.seatRow3Kg, armM: aircraft.arms.seatRow3, momentKgM: 0 },
    {
      label: 'Gepäck vorn',
      massKg: load.baggageFrontKg,
      armM: aircraft.arms.baggageFront,
      momentKgM: 0,
    },
    {
      label: 'Gepäck mitte',
      massKg: load.baggageMidKg,
      armM: aircraft.arms.baggageMid,
      momentKgM: 0,
    },
    {
      label: 'Gepäck hinten',
      massKg: load.baggageRearKg,
      armM: aircraft.arms.baggageRear,
      momentKgM: 0,
    },
  ].map((item) => ({ ...item, momentKgM: item.massKg * item.armM }))

  // Leermasse trägt bereits ihr eigenes (Hersteller-)Moment bei Referenzpunkt 0;
  // wenn ein Muster stattdessen ein Leermassemoment ungleich 0 hat, ist das über
  // arms.seatRow1 etc. hinaus nicht separat modelliert — die Leermasse wird hier
  // bewusst mit Hebelarm 0 geführt, sofern kein anderer Referenzpunkt vorliegt.
  const totalMassKg = items.reduce((sum, i) => sum + i.massKg, 0)
  const totalMomentKgM = items.reduce((sum, i) => sum + i.momentKgM, 0)
  const cgM = totalMassKg > 0 ? totalMomentKgM / totalMassKg : 0

  return {
    items,
    totalMassKg: roundMassKg(totalMassKg),
    totalMomentKgM,
    cgM,
    withinEnvelope: isWithinEnvelope(aircraft.cgEnvelope, {
      mass: totalMassKg,
      moment: totalMomentKgM,
    }),
  }
}

/**
 * Point-in-Polygon-Test (Ray-Casting) für einen (Masse, Moment)-Punkt gegen
 * das als geschlossenes Polygon definierte Schwerpunktgrenzen-Envelope.
 * Punkte exakt auf dem Rand gelten als innerhalb.
 */
export function isWithinEnvelope(envelope: MassMomentPoint[], point: MassMomentPoint): boolean {
  if (envelope.length < 3) return false

  if (isOnBoundary(envelope, point)) return true

  let inside = false
  for (let i = 0, j = envelope.length - 1; i < envelope.length; j = i++) {
    const pi = envelope[i]
    const pj = envelope[j]

    const intersects =
      pi.moment > point.moment !== pj.moment > point.moment &&
      point.mass <
        ((pj.mass - pi.mass) * (point.moment - pi.moment)) / (pj.moment - pi.moment) + pi.mass

    if (intersects) inside = !inside
  }
  return inside
}

function isOnBoundary(envelope: MassMomentPoint[], point: MassMomentPoint): boolean {
  for (let i = 0, j = envelope.length - 1; i < envelope.length; j = i++) {
    const a = envelope[j]
    const b = envelope[i]
    const cross = (b.mass - a.mass) * (point.moment - a.moment) - (b.moment - a.moment) * (point.mass - a.mass)
    if (Math.abs(cross) > 1e-9) continue
    const withinMass = point.mass >= Math.min(a.mass, b.mass) - 1e-9 && point.mass <= Math.max(a.mass, b.mass) + 1e-9
    const withinMoment =
      point.moment >= Math.min(a.moment, b.moment) - 1e-9 && point.moment <= Math.max(a.moment, b.moment) + 1e-9
    if (withinMass && withinMoment) return true
  }
  return false
}
