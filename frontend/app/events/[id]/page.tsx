'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface Event {
  id: string; title: string; description: string; city: string | null
  starts_at: string; ends_at: string; reg_deadline: string
  min_team_size: number; max_team_size: number; status: string
}
interface TeamMember { id: string; user_id: string | null; guest_name: string | null; full_name: string | null; role: string }
interface Team { id: string; name: string; status: string; category: string; captain_name: string | null; member_count: number | null; description: string | null; members: TeamMember[] }
interface Question { id: string; number: number; text: string; correct_answer: string | null; image_filename?: string | null }
interface QTeam { id: string; name: string; category: string }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// "adult" → "Лоси (взрослый зачёт)", "child" → "Лосята (детский зачёт)"
function catLabel(cat: string) {
  return cat === 'adult' ? 'Лоси (взрослый зачёт)' : 'Лосята (детский зачёт)'
}

function kpMeta(num: number) {
  const b = num < 100 ? num : num - 100
  if (b === 0)           return { border: 'border-yellow-400', bg: 'bg-yellow-50',  badge: 'bg-yellow-400 text-yellow-900',  label: 'Старт' }
  if (b >= 1 && b <= 19) return { border: 'border-red-400',    bg: 'bg-red-50',     badge: 'bg-red-600 text-white',          label: 'КП' }
  if (b >= 21 && b <= 29)return { border: 'border-blue-400',   bg: 'bg-blue-50',    badge: 'bg-blue-500 text-white',          label: 'КП↕' }
  if (b >= 31 && b <= 39)return { border: 'border-green-500',  bg: 'bg-green-50',   badge: 'bg-green-600 text-white',         label: 'ФотоКП' }
  if (b === 99)          return { border: 'border-yellow-400', bg: 'bg-yellow-50',  badge: 'bg-yellow-400 text-yellow-900',   label: 'Финиш' }
  return                        { border: 'border-stone-300',  bg: 'bg-white',      badge: 'bg-stone-500 text-white',         label: 'КП' }
}

const input = "w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-sm"

const statusMap: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Открыта регистрация', cls: 'bg-green-100 text-green-800' },
  closed:   { label: 'Регистрация закрыта', cls: 'bg-amber-100 text-amber-700' },
  finished: { label: 'Завершено',           cls: 'bg-stone-100 text-stone-600' },
}

export default function EventDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  const [event, setEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [qTeams, setQTeams] = useState<QTeam[]>([])
  const [qResults, setQResults] = useState<Record<string, number>>({})

  const [showForm, setShowForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamCategory, setTeamCategory] = useState<'adult' | 'child'>('child')
  const [captainName, setCaptainName] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [memberCount, setMemberCount] = useState(1)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/events/${id}`).then(res => setEvent(res.data)).catch(() => {})
    api.get(`/teams/event/${id}`).then(res => setTeams(res.data)).catch(() => {})
    api.get(`/admin/public/events/${id}/questions`).then(res => {
      setQuestions(res.data.questions || [])
      setQTeams(res.data.teams || [])
      setQResults(res.data.results || {})
    }).catch(() => {})
  }, [id])

  // Prefill captain name from user
  useEffect(() => {
    if (user && !captainName) setCaptainName(user.full_name || '')
  }, [user])

  const qTeamsWithCategory: QTeam[] = qTeams.map(qt => {
    const found = teams.find(t => t.id === qt.id)
    return { ...qt, category: found?.category ?? 'adult' }
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/login'); return }

    // Валидация: детский зачёт требует 2+ участников
    if (teamCategory === 'child' && memberCount < 2) {
      setError('Добавьте участников в команду или отметьте её как Лосей (взрослый зачёт)')
      return
    }
    if (!captainPhone.trim()) {
      setError('Укажите телефон капитана')
      return
    }

    setError(''); setLoading(true)
    try {
      const res = await api.post('/teams/', {
        event_id: id,
        name: teamName,
        category: teamCategory,
        captain_name: captainName,
        captain_phone: captainPhone,
        member_count: memberCount,
        description: description || null,
        members: [],
      })
      setTeams([...teams, res.data])
      setShowForm(false)
      setTeamName(''); setDescription(''); setMemberCount(1); setCaptainPhone('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Ошибка при создании команды')
    } finally { setLoading(false) }
  }

  if (!event) return <p className="text-stone-500">Загрузка...</p>

  const st = statusMap[event.status] || { label: event.status, cls: 'bg-stone-100 text-stone-600' }
  const zadaniya = questions.filter(q => q.number < 100)
  const zadachi  = questions.filter(q => q.number >= 100)

  function buildScoreboard(categoryTeams: QTeam[]) {
    return categoryTeams
      .map(t => ({
        team: t,
        kp:    zadaniya.reduce((s, q) => s + (qResults[`${q.id}|${t.id}`] ?? 0), 0),
        tasks: zadachi.reduce((s, q) => s + (qResults[`${q.id}|${t.id}`] ?? 0), 0),
        total: questions.reduce((s, q) => s + (qResults[`${q.id}|${t.id}`] ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total || b.kp - a.kp)
  }

  const adultTeams = qTeamsWithCategory.filter(t => t.category !== 'child')
  const childTeams = qTeamsWithCategory.filter(t => t.category === 'child')
  const adultBoard = buildScoreboard(adultTeams)
  const childBoard = buildScoreboard(childTeams)

  const myTeam = user ? teams.find(t => t.members.some(m => m.user_id === user.id)) : null

  const ScoreTable = ({ board, title }: { board: ReturnType<typeof buildScoreboard>, title: string }) => (
    <div>
      <h3 className="text-lg font-bold text-stone-800 mb-3">{title}</h3>
      <div className="border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-800 text-white">
            <tr>
              <th className="text-left px-4 py-3 font-semibold w-12">Место</th>
              <th className="text-left px-4 py-3 font-semibold">Команда</th>
              <th className="px-4 py-3 font-semibold text-center">КП</th>
              {zadachi.length > 0 && <th className="px-4 py-3 font-semibold text-center">Задачи</th>}
              <th className="px-4 py-3 font-semibold text-center">Итого</th>
            </tr>
          </thead>
          <tbody>
            {board.map(({ team: t, kp, tasks, total }, idx) => (
              <tr key={t.id} className={`border-t border-stone-100 ${idx === 0 ? 'bg-amber-50' : idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                <td className="px-4 py-3 font-bold text-stone-700 text-lg text-center">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>
                <td className="px-4 py-3 font-semibold text-stone-900">{t.name}</td>
                <td className="px-4 py-3 text-center text-stone-700">{kp}</td>
                {zadachi.length > 0 && <td className="px-4 py-3 text-center text-stone-700">{tasks}</td>}
                <td className="px-4 py-3 text-center font-bold text-red-700">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-extrabold text-stone-900">{event.title}</h1>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-stone-600 mb-4 leading-relaxed">{event.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-stone-500">
          <span>📅 {new Date(event.starts_at).toLocaleDateString('ru-RU')} — {new Date(event.ends_at).toLocaleDateString('ru-RU')}</span>
          {event.city && <span>📍 {event.city}</span>}
          {event.status !== 'finished' && (
            <span>⏰ Регистрация до {new Date(event.reg_deadline).toLocaleDateString('ru-RU')}</span>
          )}
          <span>👥 {event.min_team_size}–{event.max_team_size} человек</span>
        </div>
      </div>

      {/* Итоговые результаты */}
      {event.status === 'finished' && (adultBoard.length > 0 || childBoard.length > 0) && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-stone-900">🏆 Результаты</h2>
          {adultBoard.length > 0 && <ScoreTable board={adultBoard} title={catLabel('adult')} />}
          {childBoard.length > 0 && <ScoreTable board={childBoard} title={catLabel('child')} />}
          {myTeam && (
            <p className="text-sm text-stone-500">
              Ваша команда: <span className="font-semibold text-stone-700">{myTeam.name}</span>
              {' · '}
              <Link href={`/teams/${myTeam.id}/results`} className="text-red-700 hover:text-red-800 font-medium">
                Детальные результаты →
              </Link>
            </p>
          )}
        </section>
      )}

      {/* Правильные ответы */}
      {event.status === 'finished' && questions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-4">Правильные ответы</h2>
          <div className="space-y-3">
            {(() => {
              const kpMap: Record<number, { zadanie?: Question; zadacha?: Question }> = {}
              for (const q of questions) {
                const base = q.number < 100 ? q.number : q.number - 100
                if (!kpMap[base]) kpMap[base] = {}
                if (q.number < 100) kpMap[base].zadanie = q
                else kpMap[base].zadacha = q
              }
              return Object.entries(kpMap)
                .sort(([a], [b]) => +a - +b)
                .map(([baseStr, kp]) => {
                  const base = +baseStr
                  const meta = kpMeta(base)
                  return (
                    <div key={base} className={`border-2 rounded-2xl overflow-hidden ${meta.border}`}>
                      <div className={`px-4 py-2 flex items-center gap-2 ${meta.bg}`}>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                          КП-{String(base).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-medium text-stone-500">{meta.label}</span>
                      </div>
                      {kp.zadanie && (
                        <div className="px-4 py-3 border-t border-stone-100">
                          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">Задание</p>
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-stone-800 leading-snug">{kp.zadanie.text}</p>
                              {kp.zadanie.image_filename && (
                                <img src={`${API_URL}/uploads/${kp.zadanie.image_filename}`} alt=""
                                  className="mt-2 rounded-xl max-h-52 object-contain border border-stone-200" />
                              )}
                            </div>
                            {kp.zadanie.correct_answer && (
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] text-stone-400 mb-0.5">Ответ</p>
                                <p className="text-sm font-bold text-red-700">{kp.zadanie.correct_answer}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {kp.zadacha && (
                        <div className="px-4 py-3 bg-violet-50/40 border-t border-violet-100">
                          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide mb-1">Задача</p>
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-stone-800 leading-snug">{kp.zadacha.text.replace(/^Задача: /, '')}</p>
                              {kp.zadacha.image_filename && (
                                <img src={`${API_URL}/uploads/${kp.zadacha.image_filename}`} alt=""
                                  className="mt-2 rounded-xl max-h-52 object-contain border border-stone-200" />
                              )}
                            </div>
                            {kp.zadacha.correct_answer && (
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] text-stone-400 mb-0.5">Ответ</p>
                                <p className="text-sm font-bold text-red-700">{kp.zadacha.correct_answer}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            })()}
          </div>
        </section>
      )}

      {/* Зарегистрированные команды */}
      {event.status !== 'finished' && (
        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            Зарегистрированные команды ({teams.length})
          </h2>
          {teams.length === 0 ? (
            <p className="text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center">
              Команд пока нет — будьте первыми!
            </p>
          ) : (
            <div className="space-y-3">
              {(['adult', 'child'] as const).map(cat => {
                const catTeams = teams.filter(t => (t.category || 'adult') === cat)
                if (catTeams.length === 0) return null
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                      {catLabel(cat)}
                    </p>
                    {catTeams.map(team => (
                      <div key={team.id} className="bg-white border border-stone-200 rounded-2xl p-4 mb-2">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-stone-900">{team.name}</h3>
                            <p className="text-xs text-stone-400 mt-0.5">{catLabel(team.category)}</p>
                          </div>
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full font-medium shrink-0">
                            {team.member_count || team.members.length} уч.
                          </span>
                        </div>
                        {/* Капитан */}
                        {team.captain_name && (
                          <p className="text-xs text-stone-500 mb-2">
                            Капитан: <span className="font-medium text-stone-700">{team.captain_name}</span>
                          </p>
                        )}
                        {/* Участники */}
                        <div className="flex flex-wrap gap-1.5">
                          {team.members.map(m => {
                            const name = m.full_name || m.guest_name || 'Участник'
                            const isCap = m.role === 'captain'
                            return (
                              <span key={m.id} className={`text-xs px-2 py-1 rounded-full border font-medium ${
                                isCap
                                  ? 'bg-red-50 border-red-300 text-red-800'
                                  : 'bg-stone-100 border-stone-200 text-stone-700'
                              }`}>
                                {name}
                              </span>
                            )
                          })}
                        </div>
                        {team.description && (
                          <p className="text-xs text-stone-500 mt-2 italic">{team.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Регистрация */}
      {event.status === 'open' && (
        <section className="space-y-4">
          {!showForm ? (
            <button
              onClick={() => user ? setShowForm(true) : router.push('/login')}
              className="bg-red-600 text-white px-7 py-3 rounded-2xl hover:bg-red-700 font-bold transition-colors"
            >
              + Зарегистрировать команду
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">Новая команда</h2>
                <button type="button" onClick={() => { setShowForm(false); setError('') }}
                  className="text-stone-400 hover:text-red-500 text-sm">
                  Отмена
                </button>
              </div>

              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Название команды *</label>
                <input value={teamName} onChange={e => setTeamName(e.target.value)} className={input} required />
              </div>

              {/* Зачёт */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Зачёт *</label>
                <div className="flex gap-3">
                  {(['adult', 'child'] as const).map(cat => (
                    <label key={cat} className={`flex-1 flex items-center gap-2 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                      teamCategory === cat ? 'border-red-400 bg-red-50' : 'border-stone-200 hover:border-stone-300'
                    }`}>
                      <input type="radio" name="category" value={cat}
                        checked={teamCategory === cat}
                        onChange={() => setTeamCategory(cat)}
                        className="accent-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{cat === 'adult' ? 'Лоси' : 'Лосята'}</p>
                        <p className="text-xs text-stone-400">{cat === 'adult' ? 'команда без детей' : 'команда с детьми'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Капитан */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Имя капитана *</label>
                  <input value={captainName} onChange={e => setCaptainName(e.target.value)}
                    className={input} required placeholder="Имя и фамилия" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Телефон капитана *</label>
                  <input value={captainPhone} onChange={e => setCaptainPhone(e.target.value)}
                    className={input} required placeholder="+995 (999) 99-99-99" />
                </div>
              </div>

              {/* Количество участников */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Количество участников: <span className="text-red-600 font-bold">{memberCount}</span>
                </label>
                <input type="range" min={1} max={event.max_team_size}
                  value={memberCount} onChange={e => setMemberCount(+e.target.value)}
                  className="w-full accent-red-600" />
                <div className="flex justify-between text-xs text-stone-400 mt-1">
                  <span>1</span><span>{event.max_team_size}</span>
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Состав и описание команды
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className={`${input} resize-none`} rows={3}
                  placeholder="Перечислите имена участников, девиз или что угодно..." />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button type="submit" disabled={loading}
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 font-bold disabled:opacity-50 transition-colors">
                {loading ? 'Сохранение...' : 'Зарегистрировать'}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  )
}
