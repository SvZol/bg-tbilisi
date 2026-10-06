export const PARTICIPATION_FEE = '25 лари с команды'

const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

/** «11 октября 2026, 12:00–16:00», а для многодневных — «11 октября 12:00 — 12 октября 2026 16:00» */
export function formatEventRange(startIso: string, endIso: string): string {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const sameDay = s.toDateString() === e.toDateString()
  const t = (d: Date) => d.toLocaleTimeString('ru-RU', timeOpts)
  const dt = (d: Date) => `${d.toLocaleDateString('ru-RU', dateOpts)} ${t(d)}`
  return sameDay
    ? `${s.toLocaleDateString('ru-RU', dateOpts)}, ${t(s)}–${t(e)}`
    : `${dt(s)} — ${dt(e)}`
}

export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}
