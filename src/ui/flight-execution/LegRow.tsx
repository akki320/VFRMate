import { useState } from 'react'
import type { Flight } from '../../domain/types'
import { resolveLeg } from '../../domain/navigation'
import { formatDeltaMinutes, formatUtcMinutes } from '../../domain/format'
import type { FlightExecutionRow } from './useFlightExecutionViewModel'
import { AtoCell } from './AtoCell'

function courseLabel(deg: number): string {
  return `${String(deg).padStart(3, '0')}°`
}

interface LegRowProps {
  flight: Flight
  row: FlightExecutionRow
  headerOffsetPx: number
}

export function LegRow({ flight, row, headerOffsetPx }: LegRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { leg, computed, reEstimated } = row
  const resolved = resolveLeg(flight, leg)

  const rowStyle: React.CSSProperties = row.isActive
    ? {
        position: 'sticky',
        top: headerOffsetPx,
        zIndex: 5,
        backgroundColor: 'var(--signal-active-bg)',
        boxShadow: `inset 4px 0 0 var(--signal-active-border)`,
      }
    : { backgroundColor: 'transparent' }

  return (
    <>
      <tr className="transition-state border-b" style={{ ...rowStyle, borderColor: 'var(--border)' }}>
        <td className="px-1.5 py-2 align-top sm:px-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="block w-full truncate text-left font-semibold underline decoration-dotted"
            style={{ minHeight: 44, color: 'var(--text-primary)' }}
            title={leg.waypoint}
          >
            {leg.waypoint}
          </button>
        </td>
        <td className="mono-num px-1.5 py-2 align-top text-right sm:px-2">
          {leg.safetyAltitudeFt !== undefined ? leg.safetyAltitudeFt : '–'}
        </td>
        <td className="mono-num px-1.5 py-2 align-top text-right sm:px-2">{courseLabel(computed.mh)}</td>
        <td className="mono-num px-1.5 py-2 align-top text-right leading-tight sm:px-2">
          <div>{computed.legTimeMin}</div>
          <div className="text-[0.7em]" style={{ color: 'var(--text-secondary)' }}>
            {computed.remainingTimeMin}
          </div>
        </td>
        <td className="mono-num px-1.5 py-2 align-top text-right leading-tight sm:px-2">
          <div className="whitespace-nowrap">{formatUtcMinutes(computed.etoUtcMin)}</div>
          {reEstimated.deltaMin !== 0 && (
            <div
              className="text-[0.7em]"
              style={{
                color: reEstimated.deltaMin > 0 ? 'var(--signal-delta-late)' : 'var(--signal-delta-early)',
              }}
            >
              {formatDeltaMinutes(reEstimated.deltaMin)}
            </div>
          )}
        </td>
        <td className="px-1 py-2 align-top text-right sm:px-2">
          <AtoCell legId={leg.id} ato={row.ato} isActive={row.isActive} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
          <td colSpan={6} className="px-4 py-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <dl className="mono-num grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <DetailItem label="TC" value={courseLabel(leg.tc)} />
              <DetailItem label="WCA" value={`${computed.wca >= 0 ? '+' : ''}${computed.wca}°`} />
              <DetailItem label="MC" value={courseLabel(computed.mc)} />
              <DetailItem label="rwK" value={courseLabel(computed.rwK)} />
              <DetailItem
                label="Wind"
                value={`${String(resolved.wind.directionDeg).padStart(3, '0')}° / ${resolved.wind.speedKt} kt${resolved.windIsOverridden ? '' : ' (global)'}`}
              />
              <DetailItem
                label="VAR"
                value={`${resolved.variationDeg >= 0 ? '+' : ''}${resolved.variationDeg}°${resolved.variationDegIsOverridden ? '' : ' (global)'}`}
              />
              <DetailItem label="TAS" value={`${resolved.tasKt} kt${resolved.tasKtIsOverridden ? '' : ' (global)'}`} />
              <DetailItem label="GS" value={`${computed.gs} kt`} />
              <DetailItem label="Distanz Abschnitt" value={`${leg.distanceNm} NM`} />
              <DetailItem label="Distanz gesamt" value={`${row.cumulativeDistanceNm.toFixed(1)} NM`} />
              <DetailItem label="Flughöhe" value={leg.plannedAltitude || '–'} />
              <DetailItem label="Bemerkungen" value={leg.remarks || '–'} monoOff />
            </dl>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailItem({ label, value, monoOff }: { label: string; value: string; monoOff?: boolean }) {
  return (
    <div>
      <dt className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </dt>
      <dd className={monoOff ? 'font-sans' : ''} style={{ color: 'var(--text-primary)' }}>
        {value}
      </dd>
    </div>
  )
}
