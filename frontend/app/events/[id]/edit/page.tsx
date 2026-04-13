'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface Event {
  id: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  reg_deadline: string
  min_team_size: number
  max_team_size: number
  status: string
}

interface TeamMember {
  id: string
  user_id: string | null
  guest_name: string | null
  guest_email: string | null
  role: string
  is_registered: boolean
}

interface Team {
  id: string
  name: string
  status: string
  members: TeamMember[]
}

interface Result {
  id: string
  team_id: string
  rank: string | null
  score: string | null
  notes: string | null
}

interface MemberInput {
  user_id?: string
  guest_name?: string
  guest_email?: string
  role: string
}

export default function EventPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  const [event, setEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [showForm, setShowForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState<MemberInput[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

 useEffect(() => {
  if (!id) return
  
  api.get(`/events/${id}`)
    .then(res => setEvent(res.data))
    .catch(() => {}) // просто игнорируем если не найдено
  
  api.get(`/teams/event/${id}`)
    .then(res => setTeams(res.data))
    .catch(() => {})
    
  api.get(`/admin/results/${id}`)
    .then(res => setResults(res.data))
    .catch(() => {})
}, [id])

  function addMember() {
    setMembers([...members, { guest_name: '', guest_email: '', role: 'member' }])
  }

  function updateMember(index: number, field: string, value: string) {
    const updated = [...members]
    updated[index] = { ...updated[index], [field]: value }
    setMembers(updated)
  }

  function removeMember(index: number) {
    setMembers(members.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/login'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/teams/', {
        event_id: id,
        name: teamName,
        members: members.filter(m => m.guest_name || m.user_id),
      })
      setTeams([...teams, res.data])
      setShowForm(false)
      setTeamName('')
      setMembers([])
    } catch {
      setError('Ошибка при создании команды')
    } finally {
      setLoading(false)
    }
  }

  function getTeamName(team_id: string) {
    return teams.find(t => t.id === team_id)?.name || 'Команда'
  }

  if (!event) return <p className="text-gray-500">Загрузка...</p>

  const hasResults = results.length > 0
  const sortedResults = [...results].sort((a, b) => {
    if (!a.rank || !b.rank) return 0
    return parseInt(a.rank) - parseInt(b.rank)
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        <p className="text-gray-600 mb-4">{event.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>📅 {new Date(event.starts_at).toLocaleDateString('ru-RU')} — {new Date(event.ends_at).toLocaleDateString('ru-RU')}</span>
          <span>⏰ Регистрация до {new Date(event.reg_deadline).toLocaleDateString('ru-RU')}</span>
          <span>👥 {event.min_team_size}–{event.max_team_size} человек</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            event.status === 'open' ? 'bg-green-100 text-green-700' :
            event.status === 'finished' ? 'bg-gray-100 text-gray-600' :
            'bg-red-100 text-red-600'
          }`}>
            {event.status === 'open' ? 'Открыта регистрация' :
             event.status === 'finished' ? 'Завершено' : 'Закрыто'}
          </span>
        </div>
      </div>

      {hasResults && (
        <section>
          <h2 className="text-xl font-semibold mb-4">🏆 Результаты</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Место</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Команда</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Счёт</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Примечание</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, index) => (
                  <tr key={result.id} className={`border-t border-gray-100 ${index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3 font-semibold">
                      {result.rank === '1' ? '🥇' : result.rank === '2' ? '🥈' : result.rank === '3' ? '🥉' : result.rank}
                    </td>
                    <td className="px-4 py-3 font-medium">{getTeamName(result.team_id)}</td>
                    <td className="px-4 py-3 text-gray-600">{result.score || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{result.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {event.status === 'open' && (
        <button
          onClick={() => user ? setShowForm(!showForm) : router.push('/login')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Отмена' : 'Зарегистрировать команду'}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Новая команда</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название команды</label>
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700">Участники (вы добавлены автоматически)</p>
              <button type="button" onClick={addMember} className="text-sm text-blue-600 hover:underline">
                + Добавить участника
              </button>
            </div>
            {members.map((member, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  placeholder="Имя"
                  value={member.guest_name || ''}
                  onChange={e => updateMember(index, 'guest_name', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  placeholder="Email (необязательно)"
                  value={member.guest_email || ''}
                  onChange={e => updateMember(index, 'guest_email', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => removeMember(index)} className="text-red-400 hover:text-red-600 px-2">✕</button>
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Сохранение...' : 'Зарегистрировать'}
          </button>
        </form>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Зарегистрированные команды ({teams.length})</h2>
        {teams.length === 0 ? (
          <p className="text-gray-500">Команд пока нет</p>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{team.name}</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {team.members.length} участников
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.map(member => (
                    <span key={member.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {member.guest_name || 'Участник'} {member.role === 'captain' ? '👑' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}