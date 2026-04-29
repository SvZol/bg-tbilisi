'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface Event {
  id: string; title: string; description: string; city: string | null
  starts_at: string; ends_at: string; reg_deadline: string
  min_team_size: number; max_team_size: number; status: string
}

const statusMap: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Открыта регистрация', cls: 'bg-green-100 text-green-800' },
  closed:   { label: 'Регистрация закрыта', cls: 'bg-amber-100 text-amber-700' },
  finished: { label: 'Завершено',           cls: 'bg-stone-100 text-stone-600' },
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/events/').then(res => { setEvents(res.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-stone-500">Загрузка...</p>

  const active   = events.filter(e => e.status !== 'finished')
  const finished = events.filter(e => e.status === 'finished')

  const EventCard = ({ ev }: { ev: Event }) => {
    const st = statusMap[ev.status] || { label: ev.status, cls: 'bg-stone-100 text-stone-600' }
    return (
      <Link
        href={`/events/${ev.id}`}
        className="group bg-white border border-stone-200 rounded-2xl p-6 hover:border-red-300 hover:shadow-md transition-all"
      >
        <h2 className="font-bold text-stone-900 text-xl mb-1 group-hover:text-red-700 transition-colors">{ev.title}</h2>
        {ev.city && <p className="text-sm text-stone-400 mb-3">📍 {ev.city}</p>}
        <p className="text-stone-500 text-sm mb-4 line-clamp-2">{ev.description}</p>
        <div className="text-sm text-stone-500 space-y-1">
          <p>📅 {new Date(ev.starts_at).toLocaleDateString('ru-RU')} — {new Date(ev.ends_at).toLocaleDateString('ru-RU')}</p>
          {ev.status !== 'finished' && (
            <p>⏰ Регистрация до: {new Date(ev.reg_deadline).toLocaleDateString('ru-RU')}</p>
          )}
          <p>👥 {ev.min_team_size}–{ev.max_team_size} человек</p>
        </div>
        <span className={`inline-block mt-4 text-xs px-3 py-1 rounded-full font-medium ${st.cls}`}>
          {st.label}
        </span>
      </Link>
    )
  }

  if (events.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 mb-8">Мероприятия</h1>
        <div className="text-center py-16 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
          Нет мероприятий
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold text-stone-900">Мероприятия</h1>

      {active.length > 0 && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-stone-500 mb-4">Архив</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {finished.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </section>
      )}
    </div>
  )
}
