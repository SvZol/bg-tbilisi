'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface TeamMember { id: string; user_id: string | null; guest_name: string | null; guest_email: string | null; role: string; is_registered: boolean }
interface Team { id: string; event_id: string; name: string; status: string; members: TeamMember[] }

const input = "w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-sm"

export default function TeamEditPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  const [team, setTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/teams/${id}`)
      .then(res => { setTeam(res.data); setTeamName(res.data.name) })
      .catch(() => router.push('/dashboard'))
  }, [id])

  async function handleRename(e: React.FormEvent) {
    e.preventDefault(); setNameError(''); setNameLoading(true)
    try {
      const res = await api.patch(`/teams/${id}`, { name: teamName })
      setTeam(res.data)
    } catch { setNameError('Ошибка при сохранении') }
    finally { setNameLoading(false) }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault(); setAddError(''); setAddLoading(true)
    try {
      const res = await api.post(`/teams/${id}/members`, { guest_name: newName, guest_email: newEmail || undefined, role: 'member' })
      setTeam(prev => prev ? { ...prev, members: [...prev.members, res.data] } : prev)
      setNewName(''); setNewEmail('')
    } catch { setAddError('Ошибка при добавлении') }
    finally { setAddLoading(false) }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await api.delete(`/teams/${id}/members/${memberId}`)
      setTeam(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== memberId) } : prev)
    } catch { alert('Ошибка при удалении') }
  }

  if (!team) return <p className="text-stone-500">Загрузка...</p>

  const isCapitan = team.members.some(m => m.user_id === user?.id && m.role === 'captain')

  if (!isCapitan) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500 mb-4">Только капитан может редактировать команду</p>
        <Link href="/dashboard" className="text-orange-600 hover:text-orange-700 font-medium">← Назад</Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-600 text-sm">← Назад</Link>
        <h1 className="text-2xl font-extrabold text-stone-900">Редактирование команды</h1>
      </div>

      {/* Название */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-stone-900">Название команды</h2>
        <form onSubmit={handleRename} className="flex gap-2">
          <input value={teamName} onChange={e => setTeamName(e.target.value)} className={input} required />
          <button type="submit" disabled={nameLoading}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 font-medium disabled:opacity-50 shrink-0 transition-colors">
            {nameLoading ? '...' : 'Сохранить'}
          </button>
        </form>
        {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
      </div>

      {/* Участники */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-stone-900">Участники</h2>
        <div className="space-y-2">
          {team.members.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2.5">
              <div>
                <span className="text-sm font-medium text-stone-900">
                  {m.guest_name || 'Участник'} {m.role === 'captain' ? '👑' : ''}
                </span>
                {m.guest_email && <span className="text-xs text-stone-400 ml-2">{m.guest_email}</span>}
              </div>
              {m.role !== 'captain' && (
                <button onClick={() => handleRemoveMember(m.id)} className="text-red-400 hover:text-red-600 text-sm">Удалить</button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="space-y-2 pt-2 border-t border-stone-100">
          <p className="text-sm font-medium text-stone-700">Добавить участника</p>
          <div className="flex gap-2">
            <input placeholder="Имя" value={newName} onChange={e => setNewName(e.target.value)} className={input} required />
            <input placeholder="Email (необязательно)" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={input} />
            <button type="submit" disabled={addLoading}
              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-orange-600 font-medium disabled:opacity-50 shrink-0 transition-colors">
              {addLoading ? '...' : 'Добавить'}
            </button>
          </div>
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
        </form>
      </div>
    </div>
  )
}
