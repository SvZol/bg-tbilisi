'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface TeamMember { id: string; user_id: string | null; guest_name: string | null; full_name: string | null; role: string; is_registered: boolean }
interface Team { id: string; name: string; status: string; category: string; event_id: string; members: TeamMember[] }
interface Event { id: string; title: string; starts_at: string; status: string }
interface TeamWithEvent { team: Team; event: Event | null }

function CategoryToggle({ teamId, value, onChange }: {
  teamId: string
  value: string
  onChange: (val: string) => void
}) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const next = value === 'adult' ? 'child' : 'adult'
    setSaving(true)
    try {
      await api.patch(`/teams/${teamId}`, { category: next })
      onChange(next)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Ошибка изменения зачёта')
    } finally { setSaving(false) }
  }

  const isAdult = value === 'adult'
  return (
    <button
      onClick={toggle}
      disabled={saving}
      title="Нажмите чтобы изменить зачёт"
      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        isAdult
          ? 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100'
          : 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100'
      } ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      {isAdult ? '🧑 Взрослый' : '🧒 Детский'}
      <span className="text-[10px] opacity-60">✎</span>
    </button>
  )
}

function TeamCard({ teamWithEvent, isCaptain, onCategoryChange }: {
  teamWithEvent: TeamWithEvent
  isCaptain: boolean
  onCategoryChange?: (teamId: string, category: string) => void
}) {
  const { team, event } = teamWithEvent
  const finished = event?.status === 'finished'
  const canEdit = isCaptain && !finished

  return (
    <div className={`bg-white border rounded-2xl p-5 ${finished ? 'border-stone-200 opacity-90' : 'border-stone-200'}`}>
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {finished && (
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">архив</span>
            )}
            <h3 className="font-bold text-stone-900 text-lg leading-tight">{team.name}</h3>
            {/* Переключатель зачёта — только для капитана активной команды */}
            {canEdit && onCategoryChange ? (
              <CategoryToggle
                teamId={team.id}
                value={team.category || 'child'}
                onChange={val => onCategoryChange(team.id, val)}
              />
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                (team.category || 'child') === 'adult'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-violet-50 text-violet-600'
              }`}>
                {(team.category || 'child') === 'adult' ? '🧑 Взрослый' : '🧒 Детский'}
              </span>
            )}
          </div>
          {event && (
            <Link href={`/events/${event.id}`} className="text-sm text-red-700 hover:text-red-800">
              {event.title}
            </Link>
          )}
        </div>
        <div className="shrink-0">
          {finished ? (
            <Link href={`/teams/${team.id}/results`}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-xl hover:bg-red-700 font-medium transition-colors">
              Мои результаты →
            </Link>
          ) : isCaptain ? (
            <Link href={`/teams/${team.id}/edit`}
              className="text-sm text-red-700 hover:text-red-800 font-medium">
              Редактировать →
            </Link>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {team.members.map(m => (
          <span key={m.id} className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded-full">
            {m.full_name || m.guest_name || 'Участник'} {m.role === 'captain' ? '👑' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [teamsWithEvents, setTeamsWithEvents] = useState<TeamWithEvent[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      try {
        const eventsRes = await api.get('/events/')
        const allEvents: Event[] = eventsRes.data
        const allTeams: TeamWithEvent[] = []
        for (const event of allEvents) {
          try {
            const teamsRes = await api.get(`/teams/event/${event.id}`)
            const myTeams = (teamsRes.data as Team[]).filter(t =>
              t.members.some(m => String(m.user_id) === String(user!.id))
            )
            for (const team of myTeams) allTeams.push({ team, event })
          } catch {}
        }
        setTeamsWithEvents(allTeams)
      } finally { setDataLoading(false) }
    }
    fetchData()
  }, [user])

  function handleCategoryChange(teamId: string, category: string) {
    setTeamsWithEvents(prev =>
      prev.map(tw =>
        tw.team.id === teamId ? { ...tw, team: { ...tw.team, category } } : tw
      )
    )
  }

  if (loading || dataLoading) return <p className="text-stone-500">Загрузка...</p>
  if (!user) return null

  const captainTeams  = teamsWithEvents.filter(tw => tw.team.members.some(m => String(m.user_id) === String(user.id) && m.role === 'captain'))
  const memberTeams   = teamsWithEvents.filter(tw => tw.team.members.some(m => String(m.user_id) === String(user.id) && m.role !== 'captain'))

  const activeCapt    = captainTeams.filter(tw => tw.event?.status !== 'finished')
  const archivedCapt  = captainTeams.filter(tw => tw.event?.status === 'finished')
  const activeMember  = memberTeams.filter(tw => tw.event?.status !== 'finished')
  const archivedMember = memberTeams.filter(tw => tw.event?.status === 'finished')

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 mb-1">Личный кабинет</h1>
        <p className="text-stone-500">{user.email}</p>
      </div>

      {/* Мои команды (капитан) */}
      <section>
        <h2 className="text-xl font-bold text-stone-900 mb-4">Мои команды 👑</h2>
        {captainTeams.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center text-stone-500">
            Вы ещё не создавали команды.{' '}
            <Link href="/events" className="text-red-700 hover:text-red-800 font-medium">Найти мероприятие</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCapt.map(tw => (
              <TeamCard key={tw.team.id} teamWithEvent={tw} isCaptain onCategoryChange={handleCategoryChange} />
            ))}
            {archivedCapt.length > 0 && (
              <>
                {activeCapt.length > 0 && <p className="text-xs text-stone-400 uppercase tracking-widest pt-2">Архив</p>}
                {archivedCapt.map(tw => (
                  <TeamCard key={tw.team.id} teamWithEvent={tw} isCaptain />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* Участвую в командах */}
      {(activeMember.length > 0 || archivedMember.length > 0) && (
        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-4">Участвую в командах</h2>
          <div className="space-y-4">
            {activeMember.map(tw => (
              <TeamCard key={tw.team.id} teamWithEvent={tw} isCaptain={false} />
            ))}
            {archivedMember.length > 0 && (
              <>
                {activeMember.length > 0 && <p className="text-xs text-stone-400 uppercase tracking-widest pt-2">Архив</p>}
                {archivedMember.map(tw => (
                  <TeamCard key={tw.team.id} teamWithEvent={tw} isCaptain={false} />
                ))}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
