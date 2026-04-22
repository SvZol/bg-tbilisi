'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface Event { id: string; title: string; status: string; starts_at: string; ends_at: string; reg_deadline: string; city?: string; min_team_size: number; max_team_size: number }
interface Post { id: string; title: string; content: string; is_published: boolean; image_filename: string | null; created_at: string }
interface TeamMember { id: string; user_id: string | null; guest_name: string | null; guest_email: string | null; display_name: string | null; display_email: string | null; role: string; is_registered: boolean }
interface Team { id: string; name: string; status: string; category: string; members: TeamMember[] }
interface Question { id: string; number: number; text: string; correct_answer: string | null; max_points: number; is_published: boolean; image_filename?: string | null }

const input = "w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
const btn = "bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-medium transition-colors"
const btnSm = "text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium transition-colors"
const card = "bg-white border border-stone-200 rounded-2xl p-5"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Цвет и метаданные КП по номеру
function kpMeta(num: number) {
  const b = num < 100 ? num : num - 100
  if (b === 0)           return { border: 'border-yellow-400', bg: 'bg-yellow-50',  badge: 'bg-yellow-400 text-yellow-900',  label: 'Старт' }
  if (b >= 1 && b <= 19) return { border: 'border-red-400', bg: 'bg-red-50',  badge: 'bg-red-600 text-white',        label: 'КП' }
  if (b >= 21 && b <= 29)return { border: 'border-blue-400',   bg: 'bg-blue-50',    badge: 'bg-blue-500 text-white',          label: 'КП↕' }
  if (b >= 31 && b <= 39)return { border: 'border-green-500',  bg: 'bg-green-50',   badge: 'bg-green-600 text-white',         label: 'ФотоКП' }
  if (b === 99)          return { border: 'border-yellow-400', bg: 'bg-yellow-50',  badge: 'bg-yellow-400 text-yellow-900',   label: 'Финиш' }
  return                        { border: 'border-stone-200',  bg: 'bg-white',      badge: 'bg-stone-500 text-white',         label: 'КП' }
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState<Event[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [tab, setTab] = useState<'events' | 'posts' | 'teams' | 'results' | 'questions' | 'info' | 'rules' | 'users'>('events')

  // Пользователи
  interface AdminUser { id: string; email: string; full_name: string; role: string; is_verified: boolean; created_at: string; last_login_at: string | null }
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)

  const [eventForm, setEventForm] = useState({ title: '', description: '', city: '', starts_at: '', ends_at: '', reg_deadline: '', min_team_size: 2, max_team_size: 5 })
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editEventForm, setEditEventForm] = useState({ min_team_size: 2, max_team_size: 5, city: '' })
  const [postForm, setPostForm] = useState({ title: '', content: '', is_published: false })
  const [eventError, setEventError] = useState('')
  const [postError, setPostError] = useState('')
  const [uploadingPostId, setUploadingPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '', is_published: false })

  // Перенос мероприятия
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleForm, setRescheduleForm] = useState({ starts_at: '', ends_at: '', reg_deadline: '' })
  const [rescheduleMsg, setRescheduleMsg] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')

  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventTeams, setEventTeams] = useState<Team[]>([])
  const [scoreboard, setScoreboard] = useState<{ adult: any[]; child: any[] } | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfFilename, setPdfFilename] = useState<string | null>(null)

  // Вопросы
  const [questions, setQuestions] = useState<Question[]>([])
  const [qForm, setQForm] = useState({ number: 1, text: '', correct_answer: '', max_points: 1 })
  const [qResults, setQResults] = useState<Record<string, number>>({})
  const [qTeams, setQTeams] = useState<{ id: string; name: string }[]>([])
  const [editingQ, setEditingQ] = useState<string | null>(null)
  const [editQForm, setEditQForm] = useState({ text: '', correct_answer: '', max_points: 1, is_published: false })
  const [importKpMsg, setImportKpMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [importResMsg, setImportResMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [importingKp, setImportingKp] = useState(false)
  const [importingRes, setImportingRes] = useState(false)
  const [importTeamsMsg, setImportTeamsMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [importingTeams, setImportingTeams] = useState(false)
  const [importTeamsResult, setImportTeamsResult] = useState<any[] | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [publishMsg, setPublishMsg] = useState('')

  const [infoForm, setInfoForm] = useState({ title: '', content: '', is_published: true })
  const [infoMsg, setInfoMsg] = useState('')
  const [infoLoaded, setInfoLoaded] = useState(false)
  const [rulesForm, setRulesForm] = useState({ title: '', content: '', is_published: true })
  const [rulesMsg, setRulesMsg] = useState('')
  const [rulesLoaded, setRulesLoaded] = useState(false)
  const [uploadingRulesImg, setUploadingRulesImg] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    api.get('/admin/events').then(res => setEvents(res.data))
    api.get('/admin/posts').then(res => setPosts(res.data))
  }, [user])

  async function loadEventData(eventId: string) {
    setSelectedEventId(eventId)
    const teamsRes = await api.get(`/admin/teams/${eventId}`)
    setEventTeams(teamsRes.data)
  }

  async function loadQuestionsData(eventId: string) {
    setSelectedEventId(eventId)
    const res = await api.get(`/admin/events/${eventId}/question-results`)
    setQuestions(res.data.questions)
    setQTeams(res.data.teams)
    setQResults(res.data.results as Record<string, number>)
    setQForm(prev => ({ ...prev, number: (res.data.questions.length || 0) + 1 }))
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault(); setEventError('')
    try {
      const res = await api.post('/admin/events', eventForm)
      setEvents([...events, res.data])
      setEventForm({ title: '', description: '', city: '', starts_at: '', ends_at: '', reg_deadline: '', min_team_size: 2, max_team_size: 5 })
    } catch { setEventError('Ошибка при создании мероприятия') }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault(); setPostError('')
    try {
      const res = await api.post('/admin/posts', postForm)
      setPosts([res.data, ...posts])
      setPostForm({ title: '', content: '', is_published: false })
    } catch { setPostError('Ошибка при создании новости') }
  }

  async function togglePostPublish(post: Post) {
    const res = await api.patch(`/admin/posts/${post.id}`, { ...post, is_published: !post.is_published })
    setPosts(posts.map(p => p.id === post.id ? res.data : p))
  }

  async function handlePostImageUpload(postId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    setUploadingPostId(postId)
    try {
      const res = await api.post(`/admin/posts/${postId}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPosts(posts.map(p => p.id === postId ? { ...p, image_filename: res.data.image_filename } : p))
    } catch { alert('Ошибка при загрузке фото') }
    finally { setUploadingPostId(null) }
  }

  async function changeEventStatus(id: string, status: string) {
    await api.patch(`/admin/events/${id}/status?status=${status}`)
    setEvents(events.map(e => e.id === id ? { ...e, status } : e))
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault(); setRescheduleMsg('')
    try {
      await api.patch(`/admin/events/${reschedulingId}/reschedule`, rescheduleForm)
      const res = await api.get('/admin/events')
      setEvents(res.data)
      setRescheduleMsg('Перенесено! Участники оповещены.')
      setReschedulingId(null)
    } catch { setRescheduleMsg('Ошибка') }
  }

  async function handleNotifyNew(eventId: string) {
    setNotifyMsg('')
    try {
      const res = await api.post(`/admin/events/${eventId}/notify-new`)
      setNotifyMsg(`Оповещено пользователей: ${res.data.notified}`)
    } catch { setNotifyMsg('Ошибка') }
  }

  async function loadScoreboard(eventId: string) {
    try {
      const [sbRes, evRes] = await Promise.all([
        api.get(`/admin/events/${eventId}/scoreboard`),
        api.get(`/events/${eventId}`),
      ])
      setScoreboard(sbRes.data)
      setPdfFilename(evRes.data.results_pdf || null)
    } catch { setScoreboard(null) }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('Удалить команду?')) return
    await api.delete(`/admin/teams/${teamId}`)
    setEventTeams(eventTeams.filter(t => t.id !== teamId))
  }

  async function changeTeamCategory(teamId: string, category: string) {
    try {
      await api.patch(`/admin/teams/${teamId}/category?category=${category}`)
      setEventTeams(prev => prev.map(t => t.id === teamId ? { ...t, category } : t))
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Ошибка изменения зачёта')
    }
  }

  async function deleteMember(teamId: string, memberId: string) {
    if (!confirm('Удалить участника?')) return
    await api.delete(`/admin/members/${memberId}`)
    setEventTeams(eventTeams.map(t => t.id === teamId ? { ...t, members: t.members.filter(m => m.id !== memberId) } : t))
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault()
    const res = await api.post(`/admin/events/${selectedEventId}/questions`, qForm)
    setQuestions([...questions, res.data])
    setQForm(prev => ({ ...prev, number: prev.number + 1, text: '', correct_answer: '' }))
  }

  async function handleSaveQuestion(qId: string) {
    const res = await api.patch(`/admin/questions/${qId}`, editQForm)
    setQuestions(questions.map(q => q.id === qId ? { ...q, ...res.data } : q))
    setEditingQ(null)
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm('Удалить вопрос?')) return
    await api.delete(`/admin/questions/${qId}`)
    setQuestions(questions.filter(q => q.id !== qId))
  }

  async function handleQuestionImageUpload(qId: string, file: File) {
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await api.post(`/admin/questions/${qId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setQuestions(questions.map(q => q.id === qId ? { ...q, image_filename: res.data.image_filename } : q))
    } catch { alert('Ошибка при загрузке фото') }
  }

  async function handleSetPoints(qId: string, teamId: string, points: number) {
    await api.post(`/admin/questions/${qId}/results`, { team_id: teamId, points_earned: points })
    setQResults(prev => ({ ...prev, [`${qId}|${teamId}`]: points }))
  }

  async function handlePublishResults(publish: boolean) {
    if (!selectedEventId) return
    setPublishMsg('')
    try {
      const endpoint = publish ? 'publish-results' : 'unpublish-results'
      const res = await api.post(`/admin/events/${selectedEventId}/${endpoint}`)
      const count = publish ? res.data.published : res.data.unpublished
      setPublishMsg(publish ? `✓ Опубликовано ${count} вопросов — команды видят результаты` : `Скрыто ${count} вопросов`)
      await loadQuestionsData(selectedEventId)
    } catch { setPublishMsg('Ошибка') }
  }

  function handleDownloadTemplate() {
    if (!selectedEventId) return
    const token = localStorage.getItem('token')
    const url = `${API_URL}/admin/events/${selectedEventId}/results-template`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'results_template.xlsx'
        a.click()
      })
  }

  async function loadInfoPage() {
    try {
      const res = await api.get('/admin/pages/info')
      setInfoForm({ title: res.data.title, content: res.data.content, is_published: res.data.is_published })
    } catch {
      setInfoForm({ title: 'О проекте', content: '', is_published: true })
    }
    setInfoLoaded(true)
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault(); setInfoMsg('')
    try {
      await api.put('/admin/pages/info', infoForm)
      setInfoMsg('Сохранено')
    } catch { setInfoMsg('Ошибка') }
  }

  async function loadRulesPage() {
    try {
      const res = await api.get('/admin/pages/rules')
      setRulesForm({ title: res.data.title, content: res.data.content, is_published: res.data.is_published })
    } catch {
      setRulesForm({ title: 'Правила игры', content: '', is_published: true })
    }
    setRulesLoaded(true)
  }

  async function handleSaveRules(e: React.FormEvent) {
    e.preventDefault(); setRulesMsg('')
    try {
      await api.put('/admin/pages/rules', rulesForm)
      setRulesMsg('Сохранено')
    } catch { setRulesMsg('Ошибка') }
  }

  async function handleRulesImageUpload(file: File) {
    setUploadingRulesImg(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await api.post('/admin/pages/rules/image', fd)
      const insertText = `\n![картинка](${res.data.url})\n`
      setRulesForm(f => ({ ...f, content: f.content + insertText }))
    } catch { alert('Ошибка загрузки') }
    finally { setUploadingRulesImg(false) }
  }

  async function handleImportKp(file: File) {
    if (!selectedEventId) return
    setImportingKp(true); setImportKpMsg(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await api.post(`/admin/events/${selectedEventId}/import-kp-excel`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportKpMsg({ type: 'ok', text: res.data.message })
      await loadQuestionsData(selectedEventId)
    } catch (e: any) {
      setImportKpMsg({ type: 'err', text: e?.response?.data?.detail || 'Ошибка импорта' })
    } finally { setImportingKp(false) }
  }

  async function loadUsers() {
    const res = await api.get('/admin/users')
    setUsers(res.data)
    setUsersLoaded(true)
  }

  async function handleImportResults(file: File) {
    if (!selectedEventId) return
    setImportingRes(true); setImportResMsg(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await api.post(`/admin/events/${selectedEventId}/import-results-excel`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const d = res.data
      let text = `Создано ${d.created} результатов.`
      if (d.auto_created_teams) text += ` Автоматически создано команд: ${d.auto_created_teams}.`
      text += ` Совпало команд: ${d.teams_found?.length || 0}.`
      if (d.unmatched_teams?.length) text += ` Не найдено: ${d.unmatched_teams.join(', ')}`
      setImportResMsg({ type: d.unmatched_teams?.length ? 'err' : 'ok', text })
      await loadQuestionsData(selectedEventId)
    } catch (e: any) {
      setImportResMsg({ type: 'err', text: e?.response?.data?.detail || 'Ошибка импорта' })
    } finally { setImportingRes(false) }
  }

  if (loading) return <p className="text-stone-700">Загрузка...</p>
  if (!user || user.role !== 'admin') return null

  const tabs = [
    { key: 'events', label: '📅 Мероприятия' },
    { key: 'posts', label: '📰 Новости' },
    { key: 'teams', label: '👥 Команды' },
    { key: 'results', label: '🏆 Результаты' },
    { key: 'questions', label: '❓ Вопросы' },
    { key: 'info', label: '📄 О проекте' },
    { key: 'rules', label: '📋 Правила' },
    { key: 'users', label: '👤 Пользователи' },
  ] as const

  const eventSelector = (onSelect: (id: string) => void) => (
    <div className="flex flex-wrap gap-2 mb-6">
      {events.map(ev => (
        <button
          key={ev.id}
          onClick={() => onSelect(ev.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            selectedEventId === ev.id
              ? 'bg-red-600 text-white border-red-600'
              : 'border-stone-300 text-stone-700 hover:border-red-400 bg-white'
          }`}
        >
          {ev.title}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-stone-900">Панель администратора</h1>

      {/* Табы */}
      <div className="flex gap-1 border-b border-stone-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── МЕРОПРИЯТИЯ ── */}
      {tab === 'events' && (
        <div className="space-y-6">
          <div className={card}>
            <h2 className="font-bold text-stone-900 mb-4">Новое мероприятие</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Название</label>
                  <input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className={input} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Описание</label>
                  <input value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Город</label>
                  <input value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} className={input} placeholder="Тбилиси" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Начало</label>
                  <input type="datetime-local" value={eventForm.starts_at} onChange={e => setEventForm({ ...eventForm, starts_at: e.target.value })} className={input} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Конец</label>
                  <input type="datetime-local" value={eventForm.ends_at} onChange={e => setEventForm({ ...eventForm, ends_at: e.target.value })} className={input} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Дедлайн регистрации</label>
                  <input type="datetime-local" value={eventForm.reg_deadline} onChange={e => setEventForm({ ...eventForm, reg_deadline: e.target.value })} className={input} required />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Мин. участников</label>
                    <input type="number" value={eventForm.min_team_size} onChange={e => setEventForm({ ...eventForm, min_team_size: +e.target.value })} className={input} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Макс. участников</label>
                    <input type="number" value={eventForm.max_team_size} onChange={e => setEventForm({ ...eventForm, max_team_size: +e.target.value })} className={input} />
                  </div>
                </div>
              </div>
              {eventError && <p className="text-red-500 text-sm">{eventError}</p>}
              <button type="submit" className={btn}>Создать мероприятие</button>
            </form>
          </div>

          <div>
            <h2 className="font-bold text-stone-900 mb-3">Все мероприятия</h2>
            {notifyMsg && <p className="text-sm text-green-700 mb-3 font-medium">{notifyMsg}</p>}
            {rescheduleMsg && <p className="text-sm text-green-700 mb-3 font-medium">{rescheduleMsg}</p>}
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className={card}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-stone-900">{ev.title}</p>
                      <p className="text-sm text-stone-500">
                        {new Date(ev.starts_at).toLocaleDateString('ru-RU')} — рег. до {new Date(ev.reg_deadline).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select value={ev.status} onChange={e => changeEventStatus(ev.id, e.target.value)}
                        className="text-sm border border-stone-300 rounded-xl px-3 py-1.5 text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
                        <option value="open">Открыто</option>
                        <option value="closed">Закрыто</option>
                        <option value="finished">Завершено</option>
                      </select>
                      <button onClick={() => { setReschedulingId(ev.id); setRescheduleMsg(''); setRescheduleForm({ starts_at: ev.starts_at.slice(0,16), ends_at: ev.ends_at.slice(0,16), reg_deadline: ev.reg_deadline.slice(0,16) }) }}
                        className="text-sm border border-stone-300 px-3 py-1.5 rounded-xl hover:border-red-400 text-stone-700 transition-colors">
                        Перенести
                      </button>
                      <button onClick={() => handleNotifyNew(ev.id)}
                        className="text-sm border border-stone-300 px-3 py-1.5 rounded-xl hover:border-red-400 text-stone-700 transition-colors">
                        Оповестить всех
                      </button>
                      <button onClick={() => {
                        setEditingEventId(ev.id)
                        setEditEventForm({ min_team_size: ev.min_team_size, max_team_size: ev.max_team_size, city: (ev as any).city || '' })
                      }}
                        className="text-sm border border-stone-300 px-3 py-1.5 rounded-xl hover:border-red-400 text-stone-700 transition-colors">
                        Изменить
                      </button>
                    </div>
                  </div>

                  {editingEventId === ev.id && (
                    <div className="mt-4 pt-4 border-t border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Город</label>
                        <input value={editEventForm.city}
                          onChange={e => setEditEventForm({ ...editEventForm, city: e.target.value })}
                          className={input} placeholder="Тбилиси" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Мин. участников</label>
                        <input type="number" value={editEventForm.min_team_size}
                          onChange={e => setEditEventForm({ ...editEventForm, min_team_size: +e.target.value })}
                          className={input} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Макс. участников</label>
                        <input type="number" value={editEventForm.max_team_size}
                          onChange={e => setEditEventForm({ ...editEventForm, max_team_size: +e.target.value })}
                          className={input} />
                      </div>
                      <div className="md:col-span-3 flex gap-2">
                        <button onClick={async () => {
                          await api.patch(`/admin/events/${ev.id}`, editEventForm)
                          setEvents(events.map(e => e.id === ev.id ? { ...e, ...editEventForm } : e))
                          setEditingEventId(null)
                        }} className={btnSm}>Сохранить</button>
                        <button onClick={() => setEditingEventId(null)}
                          className="text-sm text-stone-500 hover:text-stone-700 px-3 py-1.5">Отмена</button>
                      </div>
                    </div>
                  )}

                  {reschedulingId === ev.id && (
                    <form onSubmit={handleReschedule} className="mt-4 pt-4 border-t border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Новая дата начала</label>
                        <input type="datetime-local" value={rescheduleForm.starts_at}
                          onChange={e => setRescheduleForm({ ...rescheduleForm, starts_at: e.target.value })}
                          className={input} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Новая дата окончания</label>
                        <input type="datetime-local" value={rescheduleForm.ends_at}
                          onChange={e => setRescheduleForm({ ...rescheduleForm, ends_at: e.target.value })}
                          className={input} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Дедлайн регистрации</label>
                        <input type="datetime-local" value={rescheduleForm.reg_deadline}
                          onChange={e => setRescheduleForm({ ...rescheduleForm, reg_deadline: e.target.value })}
                          className={input} required />
                      </div>
                      <div className="md:col-span-3 flex gap-2">
                        <button type="submit" className={btnSm}>Сохранить и оповестить участников</button>
                        <button type="button" onClick={() => setReschedulingId(null)}
                          className="text-sm text-stone-500 hover:text-stone-700 px-3 py-1.5">Отмена</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── НОВОСТИ ── */}
      {tab === 'posts' && (
        <div className="space-y-6">
          <div className={card}>
            <h2 className="font-bold text-stone-900 mb-4">Новая новость</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Заголовок</label>
                <input value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} className={input} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Текст</label>
                <textarea value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} rows={5} className={input} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input type="checkbox" checked={postForm.is_published} onChange={e => setPostForm({ ...postForm, is_published: e.target.checked })} />
                Опубликовать сразу
              </label>
              {postError && <p className="text-red-500 text-sm">{postError}</p>}
              <button type="submit" className={btn}>Создать новость</button>
            </form>
          </div>

          <div>
            <h2 className="font-bold text-stone-900 mb-3">Все новости</h2>
            <div className="space-y-3">
              {posts.map(post => (
                <div key={post.id} className={`${card} space-y-3`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900">{post.title}</p>
                      <p className="text-sm text-stone-500">{new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => togglePostPublish(post)}
                        className={`text-sm px-3 py-1 rounded-full font-medium ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                        {post.is_published ? 'Опубликовано' : 'Черновик'}
                      </button>
                      <button onClick={() => {
                        setEditingPostId(post.id)
                        setEditPostForm({ title: post.title, content: post.content, is_published: post.is_published })
                      }} className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-3 py-1 rounded-lg hover:bg-stone-50">
                        Изменить
                      </button>
                      <button onClick={async () => {
                        if (!confirm('Удалить новость?')) return
                        await api.delete(`/admin/posts/${post.id}`)
                        setPosts(posts.filter(p => p.id !== post.id))
                      }} className="text-sm text-red-400 hover:text-red-600 border border-red-100 px-3 py-1 rounded-lg hover:bg-red-50">
                        Удалить
                      </button>
                    </div>
                  </div>

                  {editingPostId === post.id && (
                    <form onSubmit={async e => {
                      e.preventDefault()
                      const res = await api.patch(`/admin/posts/${post.id}`, editPostForm)
                      setPosts(posts.map(p => p.id === post.id ? { ...p, ...res.data } : p))
                      setEditingPostId(null)
                    }} className="space-y-2 border-t border-stone-100 pt-3">
                      <input value={editPostForm.title} onChange={e => setEditPostForm({ ...editPostForm, title: e.target.value })}
                        className={input} placeholder="Заголовок" required />
                      <textarea value={editPostForm.content} onChange={e => setEditPostForm({ ...editPostForm, content: e.target.value })}
                        rows={5} className={input} placeholder="Текст (поддерживается Markdown)" required />
                      <div className="flex gap-2">
                        <button type="submit" className={btn}>Сохранить</button>
                        <button type="button" onClick={() => setEditingPostId(null)}
                          className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm">
                          Отмена
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex items-center gap-4">
                    {post.image_filename && (
                      <img src={`${API_URL}/uploads/${post.image_filename}`} alt="" className="h-16 w-24 object-cover rounded-xl border border-stone-200" />
                    )}
                    <label className="cursor-pointer text-sm text-red-700 hover:text-red-800 font-medium">
                      {uploadingPostId === post.id ? 'Загрузка...' : post.image_filename ? '🔄 Заменить фото' : '📷 Добавить фото'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingPostId === post.id}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePostImageUpload(post.id, f); e.target.value = '' }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── КОМАНДЫ ── */}
      {tab === 'teams' && (
        <div className="space-y-5">
          <h2 className="font-bold text-stone-900">Выберите мероприятие</h2>
          {eventSelector(loadEventData)}
          {selectedEventId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-bold text-stone-900">Команды ({eventTeams.length})</h3>
                <div className="flex items-center gap-2">
                  <label className={`${btnSm} cursor-pointer ${importingTeams ? 'opacity-50' : ''}`}>
                    {importingTeams ? 'Импорт...' : '↑ Импорт из Excel'}
                    <input type="file" accept=".xlsx" className="hidden" disabled={importingTeams}
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return
                        setImportingTeams(true); setImportTeamsMsg(null)
                        const form = new FormData(); form.append('file', f)
                        try {
                          const res = await api.post(`/admin/events/${selectedEventId}/import-teams-excel`, form)
                          setImportTeamsMsg({ type: 'ok', text: `Добавлено ${res.data.created} команд, пропущено ${res.data.skipped}` })
                          setImportTeamsResult(res.data.teams)
                          await loadEventData(selectedEventId)
                        } catch (err: any) {
                          setImportTeamsMsg({ type: 'err', text: err?.response?.data?.detail || 'Ошибка импорта' })
                          setImportTeamsResult(null)
                        } finally { setImportingTeams(false); e.target.value = '' }
                      }} />
                  </label>
                </div>
              </div>
              {importTeamsMsg && (
                <p className={`text-sm font-medium ${importTeamsMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                  {importTeamsMsg.text}
                </p>
              )}
              {importTeamsResult && importTeamsResult.length > 0 && (
                <div className={`${card} space-y-3`}>
                  <h4 className="font-bold text-stone-900">Результаты импорта</h4>
                  {importTeamsResult.map((t, i) => (
                    <div key={i} className="border border-stone-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-stone-800">{t.team}</span>
                        <div className="flex items-center gap-2">
                          {t.telegram && (
                            <a href={`https://t.me/${t.telegram?.replace(/^@/, '').replace(/^t\.me\//, '')}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                              {t.telegram} ↗
                            </a>
                          )}
                          {t.email_sent && <span className="text-xs text-green-600">✓ письмо отправлено</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">Код приглашения:</span>
                        <code className="text-xs font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-800 tracking-widest">{t.invite_code}</code>
                        <span className="text-xs text-stone-400">{t.claim_url}</span>
                      </div>
                      {t.telegram_message && (
                        <>
                          <pre className="text-xs text-stone-700 bg-stone-50 rounded-lg p-3 whitespace-pre-wrap font-sans">{t.telegram_message}</pre>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(t.telegram_message)
                              setCopiedIdx(i)
                              setTimeout(() => setCopiedIdx(null), 2000)
                            }}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copiedIdx === i ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                            {copiedIdx === i ? '✓ Скопировано' : 'Копировать сообщение'}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {eventTeams.length === 0 ? <p className="text-stone-500">Команд пока нет</p> : eventTeams.map(team => (
                <div key={team.id} className={card}>
                  <div className="flex justify-between items-center mb-3 gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-900">{team.name}</h4>
                      {/* Переключатель зачёта */}
                      <select
                        value={team.category || 'child'}
                        onChange={e => changeTeamCategory(team.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors ${
                          (team.category || 'child') === 'adult'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-violet-50 border-violet-300 text-violet-700'
                        }`}
                      >
                        <option value="child">Лосята (детский зачёт)</option>
                        <option value="adult">Лоси (взрослый зачёт)</option>
                      </select>
                      <a href={`/teams/${team.id}/results`} target="_blank" rel="noreferrer"
                        className="text-xs text-red-700 hover:text-red-800 font-medium border border-red-200 px-2 py-0.5 rounded-lg">
                        Результаты ↗
                      </a>
                    </div>
                    <button onClick={() => deleteTeam(team.id)} className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 shrink-0">Удалить</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50">
                      <tr>
                        {['Имя', 'Email', 'Роль', 'Статус', ''].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-stone-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {team.members.map(m => (
                        <tr key={m.id} className="border-t border-stone-100">
                          <td className="px-3 py-2 text-stone-900">{m.display_name || '—'}</td>
                          <td className="px-3 py-2 text-stone-600">{m.display_email || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'captain' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>
                              {m.role === 'captain' ? '👑 Капитан' : 'Участник'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_registered ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
                              {m.is_registered ? 'Зарег.' : 'Гость'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {m.role !== 'captain' && (
                              <button onClick={() => deleteMember(team.id, m.id)} className="text-red-400 hover:text-red-600 text-xs">Удалить</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── РЕЗУЛЬТАТЫ ── */}
      {tab === 'results' && (
        <div className="space-y-5">
          <h2 className="font-bold text-stone-900">Выберите мероприятие</h2>
          {eventSelector((id) => { loadEventData(id); loadScoreboard(id) })}
          {selectedEventId && (
            <>
              {/* PDF раздатки */}
              <div className={`${card} flex items-center gap-4 flex-wrap`}>
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-900">Раздатки (PDF)</p>
                  {pdfFilename
                    ? <a href={`${API_URL}/uploads/pdfs/${pdfFilename}`} target="_blank" rel="noreferrer"
                        className="text-sm text-red-700 hover:underline">{pdfFilename}</a>
                    : <p className="text-sm text-stone-400">Файл не загружен</p>
                  }
                </div>
                <div className="flex gap-2">
                  <label className={`${btnSm} cursor-pointer ${uploadingPdf ? 'opacity-50' : ''}`}>
                    {uploadingPdf ? 'Загрузка...' : pdfFilename ? 'Заменить PDF' : 'Загрузить PDF'}
                    <input type="file" accept=".pdf" className="hidden" disabled={uploadingPdf}
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return
                        setUploadingPdf(true)
                        const fd = new FormData(); fd.append('file', f)
                        try {
                          const res = await api.post(`/admin/events/${selectedEventId}/upload-results-pdf`, fd)
                          setPdfFilename(res.data.filename)
                        } catch (err: any) {
                          alert(err?.response?.data?.detail || 'Ошибка загрузки')
                        } finally { setUploadingPdf(false); e.target.value = '' }
                      }} />
                  </label>
                  {pdfFilename && (
                    <button onClick={async () => {
                      if (!confirm('Удалить PDF?')) return
                      await api.delete(`/admin/events/${selectedEventId}/results-pdf`)
                      setPdfFilename(null)
                    }} className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50">
                      Удалить
                    </button>
                  )}
                </div>
              </div>

              {!scoreboard ? (
                <p className="text-stone-500">Нет данных</p>
              ) : (
                <>
                  {[
                    { key: 'adult', label: 'Лоси (взрослый зачёт)', rows: scoreboard.adult },
                    { key: 'child', label: 'Лосята (детский зачёт)', rows: scoreboard.child },
                  ].map(({ key, label, rows }) => rows.length === 0 ? null : (
                    <div key={key}>
                      <h3 className="font-bold text-stone-700 mb-2">{label}</h3>
                      <div className="border border-stone-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-stone-50">
                            <tr>
                              {['#', 'Команда', 'Баллы'].map(h => (
                                <th key={h} className="text-left px-4 py-3 font-medium text-stone-700">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.id} className="border-t border-stone-100">
                                <td className="px-4 py-3 font-bold text-stone-500 w-10">{r.rank}</td>
                                <td className="px-4 py-3 text-stone-900 font-medium">{r.name}</td>
                                <td className="px-4 py-3 text-stone-700">{r.score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ВОПРОСЫ ── */}
      {tab === 'questions' && (
        <div className="space-y-5">
          <h2 className="font-bold text-stone-900">Выберите мероприятие</h2>
          {eventSelector(loadQuestionsData)}

          {selectedEventId && (
            <>
              {/* Публикация результатов */}
              <div className={`${card} flex items-center justify-between gap-4 flex-wrap`}>
                <div>
                  <h3 className="font-bold text-stone-900">Публикация результатов</h3>
                  <p className="text-sm text-stone-500 mt-0.5">Команды увидят свои ответы и правильные ответы по всем КП</p>
                  {publishMsg && <p className="text-sm text-green-700 mt-1">{publishMsg}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePublishResults(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 font-medium text-sm transition-colors">
                    ✓ Опубликовать результаты
                  </button>
                  <button onClick={() => handlePublishResults(false)}
                    className="border border-stone-300 text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-50 font-medium text-sm transition-colors">
                    Скрыть
                  </button>
                </div>
              </div>

              {/* Импорт из Excel */}
              <div className={card}>
                <h3 className="font-bold text-stone-900 mb-1">Импорт из Excel</h3>
                <p className="text-sm text-stone-500 mb-4">
                  Шаг 1: загрузите файл <span className="font-medium text-stone-700">«все КП.xlsx»</span> — создаст вопросы.<br/>
                  Шаг 2: загрузите файл <span className="font-medium text-stone-700">«результаты.xlsx»</span> — импортирует очки команд.<br/>
                  <span className="text-red-700">Внимание: названия команд в Excel должны точно совпадать с названиями в системе.</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-stone-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-stone-800">📋 Шаг 1 — КП и ответы</p>
                    <p className="text-xs text-stone-500">Файл «все КП.xlsx» (лист «Все КП»)</p>
                    <label className="block">
                      <span className={`inline-block cursor-pointer ${btnSm} ${importingKp ? 'opacity-50 pointer-events-none' : ''}`}>
                        {importingKp ? 'Загрузка...' : '📂 Выбрать файл'}
                        <input type="file" accept=".xlsx" className="hidden" disabled={importingKp}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleImportKp(f); e.target.value = '' }} />
                      </span>
                    </label>
                    {importKpMsg && (
                      <p className={`text-sm ${importKpMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                        {importKpMsg.type === 'ok' ? '✓ ' : '✗ '}{importKpMsg.text}
                      </p>
                    )}
                  </div>

                  <div className="border border-stone-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-stone-800">📊 Шаг 2 — Результаты команд</p>
                    <p className="text-xs text-stone-500 mb-1">
                      Вариант А: загрузите оригинальный файл (лист «проверка»).<br/>
                      Вариант Б: скачайте шаблон с ID команд, заполните и загрузите.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={handleDownloadTemplate} className={`${btnSm} bg-stone-600 hover:bg-stone-700`}>
                        ⬇ Скачать шаблон
                      </button>
                      <label className="block">
                        <span className={`inline-block cursor-pointer ${btnSm} ${importingRes ? 'opacity-50 pointer-events-none' : ''}`}>
                          {importingRes ? 'Загрузка...' : '📂 Загрузить файл'}
                          <input type="file" accept=".xlsx" className="hidden" disabled={importingRes}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleImportResults(f); e.target.value = '' }} />
                        </span>
                      </label>
                    </div>
                    {importResMsg && (
                      <p className={`text-sm ${importResMsg.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                        {importResMsg.type === 'ok' ? '✓ ' : '⚠ '}{importResMsg.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Добавить вопрос вручную */}
              <div className={card}>
                <h3 className="font-bold text-stone-900 mb-4">Добавить вопрос вручную</h3>
                <form onSubmit={handleCreateQuestion} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="block text-sm font-medium text-stone-700 mb-1">№</label>
                      <input type="number" value={qForm.number} onChange={e => setQForm({ ...qForm, number: +e.target.value })} className={input} required />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Текст вопроса</label>
                      <input value={qForm.text} onChange={e => setQForm({ ...qForm, text: e.target.value })} className={input} required />
                    </div>
                    <div className="w-28">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Очки</label>
                      <input type="number" value={qForm.max_points} onChange={e => setQForm({ ...qForm, max_points: +e.target.value })} className={input} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Правильный ответ</label>
                    <input value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} className={input} placeholder="Оставьте пустым если ещё неизвестен" />
                  </div>
                  <button type="submit" className={btn}>Добавить вопрос</button>
                </form>
              </div>

              {/* Список вопросов и таблица очков */}
              {questions.length > 0 && (
                <div className="space-y-4">
                  {/* Список вопросов — группировка по КП */}
                  <div className={card}>
                    <h3 className="font-bold text-stone-900 mb-3">Вопросы и ответы</h3>
                    <div className="space-y-3">
                      {(() => {
                        // Группируем задания (number<100) и задачи (number>=100) по базовому номеру КП
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
                            const anyQ = kp.zadanie || kp.zadacha!
                            return (
                              <div key={base} className={`border-2 rounded-xl overflow-hidden ${meta.border}`}>
                                {/* Заголовок КП */}
                                <div className={`px-3 py-2 flex items-center gap-2 ${meta.bg}`}>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                                    КП-{String(base).padStart(2,'0')}
                                  </span>
                                  <span className="text-xs text-stone-500 font-medium">{meta.label}</span>
                                </div>

                                {/* Задание */}
                                {kp.zadanie && (() => {
                                  const q = kp.zadanie!
                                  return editingQ === q.id ? (
                                    <div className="p-4 space-y-3 border-t border-stone-100">
                                      <p className="text-xs font-semibold text-stone-500 uppercase">Задание</p>
                                      <input value={editQForm.text} onChange={e => setEditQForm({...editQForm, text: e.target.value})} className={input} />
                                      <input placeholder="Правильный ответ" value={editQForm.correct_answer} onChange={e => setEditQForm({...editQForm, correct_answer: e.target.value})} className={input} />
                                      <div className="flex gap-3 items-center">
                                        <input type="number" value={editQForm.max_points} onChange={e => setEditQForm({...editQForm, max_points: +e.target.value})} className={`${input} w-20`} />
                                        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                                          <input type="checkbox" checked={editQForm.is_published} onChange={e => setEditQForm({...editQForm, is_published: e.target.checked})} />
                                          Опубликовать
                                        </label>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleSaveQuestion(q.id)} className={btnSm}>Сохранить</button>
                                        <button onClick={() => setEditingQ(null)} className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600">Отмена</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="px-4 py-3 border-t border-stone-100 flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-0.5">Задание</p>
                                        <p className="text-sm text-stone-800">{q.text}</p>
                                        {q.correct_answer && <p className="text-sm text-red-700 font-semibold mt-0.5">✓ {q.correct_answer}</p>}
                                        {q.image_filename && (
                                          <img src={`${API_URL}/uploads/${q.image_filename}`} alt="" className="mt-2 max-h-28 rounded-lg border border-stone-200" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {q.is_published
                                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Опубл.</span>
                                          : <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Скрыт</span>
                                        }
                                        <label className="cursor-pointer text-xs text-stone-400 hover:text-red-700" title="Загрузить фото">
                                          📷
                                          <input type="file" accept="image/*" className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if(f) handleQuestionImageUpload(q.id, f); e.target.value='' }} />
                                        </label>
                                        <button onClick={() => { setEditingQ(q.id); setEditQForm({text:q.text, correct_answer:q.correct_answer||'', max_points:q.max_points, is_published:q.is_published}) }}
                                          className="text-xs text-red-700 hover:text-red-800 font-medium">Изм.</button>
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Задача */}
                                {kp.zadacha && (() => {
                                  const q = kp.zadacha!
                                  return editingQ === q.id ? (
                                    <div className="p-4 space-y-3 bg-violet-50/50 border-t border-violet-100">
                                      <p className="text-xs font-semibold text-violet-600 uppercase">Задача</p>
                                      <textarea value={editQForm.text} onChange={e => setEditQForm({...editQForm, text: e.target.value})} rows={3} className={input} />
                                      <input placeholder="Правильный ответ" value={editQForm.correct_answer} onChange={e => setEditQForm({...editQForm, correct_answer: e.target.value})} className={input} />
                                      <div className="flex gap-3 items-center">
                                        <input type="number" value={editQForm.max_points} onChange={e => setEditQForm({...editQForm, max_points: +e.target.value})} className={`${input} w-20`} />
                                        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                                          <input type="checkbox" checked={editQForm.is_published} onChange={e => setEditQForm({...editQForm, is_published: e.target.checked})} />
                                          Опубликовать
                                        </label>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleSaveQuestion(q.id)} className={btnSm}>Сохранить</button>
                                        <button onClick={() => setEditingQ(null)} className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600">Отмена</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="px-4 py-3 bg-violet-50/40 border-t border-violet-100 flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide mb-0.5">Задача</p>
                                        <p className="text-sm text-stone-800">{q.text.replace(/^Задача: /,'')}</p>
                                        {q.correct_answer && <p className="text-sm text-red-700 font-semibold mt-0.5">✓ {q.correct_answer}</p>}
                                        {q.image_filename && (
                                          <img src={`${API_URL}/uploads/${q.image_filename}`} alt="" className="mt-2 max-h-28 rounded-lg border border-stone-200" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {q.is_published
                                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Опубл.</span>
                                          : <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Скрыт</span>
                                        }
                                        <label className="cursor-pointer text-xs text-stone-400 hover:text-red-700" title="Загрузить фото">
                                          📷
                                          <input type="file" accept="image/*" className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if(f) handleQuestionImageUpload(q.id, f); e.target.value='' }} />
                                        </label>
                                        <button onClick={() => { setEditingQ(q.id); setEditQForm({text:q.text, correct_answer:q.correct_answer||'', max_points:q.max_points, is_published:q.is_published}) }}
                                          className="text-xs text-red-700 hover:text-red-800 font-medium">Изм.</button>
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            )
                          })
                      })()}
                    </div>
                  </div>

                  {/* Таблица очков команд */}
                  {qTeams.length > 0 && (
                    <div className={card}>
                      <h3 className="font-bold text-stone-900 mb-3">Очки команд по вопросам</h3>
                      <div className="overflow-x-auto">
                        <table className="text-sm w-full">
                          <thead className="bg-stone-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-stone-700 whitespace-nowrap">Вопрос</th>
                              {qTeams.map(t => (
                                <th key={t.id} className="px-3 py-2 font-medium text-stone-700 whitespace-nowrap">{t.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {questions.map(q => (
                              <tr key={q.id} className="border-t border-stone-100">
                                <td className="px-3 py-2 text-stone-800 whitespace-nowrap">
                                  #{q.number} <span className="text-stone-500 text-xs">({q.max_points} очк.)</span>
                                </td>
                                {qTeams.map(t => {
                                  const key = `${q.id}|${t.id}`
                                  const val = qResults[key] ?? 0
                                  return (
                                    <td key={t.id} className="px-2 py-1.5 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={q.max_points}
                                        value={val}
                                        onChange={e => handleSetPoints(q.id, t.id, +e.target.value)}
                                        className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-center text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                            {/* Итого */}
                            <tr className="border-t-2 border-stone-300 bg-stone-50 font-bold">
                              <td className="px-3 py-2 text-stone-900">Итого</td>
                              {qTeams.map(t => {
                                const total = questions.reduce((sum, q) => sum + (qResults[`${q.id}|${t.id}`] ?? 0), 0)
                                const max = questions.reduce((sum, q) => sum + q.max_points, 0)
                                return (
                                  <td key={t.id} className="px-3 py-2 text-center text-stone-900">{total}<span className="text-stone-400 font-normal">/{max}</span></td>
                                )
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── СТРАНИЦА «О ПРОЕКТЕ» ── */}
      {tab === 'users' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">Управление ролями. Роль <span className="font-semibold text-red-700">admin</span> даёт полный доступ к этой панели.</p>
            {!usersLoaded
              ? <button className={btn} onClick={loadUsers}>Загрузить список</button>
              : <button className="text-sm text-stone-500 hover:text-stone-700" onClick={loadUsers}>↻ Обновить</button>
            }
          </div>
          {usersLoaded && (
            <div className={card + ' p-0 overflow-hidden'}>
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-stone-700">Имя</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-700">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-700">Роль</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-700">Последний вход</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-stone-900 font-medium">{u.full_name}</td>
                      <td className="px-4 py-3 text-stone-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.last_login_at
                          ? <span className="text-green-700">{new Date(u.last_login_at).toLocaleDateString('ru-RU')}</span>
                          : <span className="text-stone-400">не входил</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-stone-400">
                        {new Date(u.created_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-5">
          <p className="text-sm text-stone-500">
            Содержимое страницы <span className="font-medium text-stone-700">/rules</span>. Поддерживается Markdown и картинки.
          </p>
          <div className={card}>
            {!rulesLoaded
              ? <button className={btn} onClick={loadRulesPage}>Загрузить страницу</button>
              : (
                <form onSubmit={handleSaveRules} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Заголовок</label>
                    <input value={rulesForm.title} onChange={e => setRulesForm({ ...rulesForm, title: e.target.value })} className={input} required />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-stone-700">
                        Содержимое
                        <span className="ml-2 text-xs font-normal text-stone-400">Markdown — **жирный**, # заголовок, ![alt](url)</span>
                      </label>
                      <label className={`${btnSm} cursor-pointer ${uploadingRulesImg ? 'opacity-50' : ''}`}>
                        {uploadingRulesImg ? 'Загрузка...' : '📷 Добавить картинку'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingRulesImg}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleRulesImageUpload(f); e.target.value = '' }} />
                      </label>
                    </div>
                    <textarea
                      value={rulesForm.content}
                      onChange={e => setRulesForm({ ...rulesForm, content: e.target.value })}
                      rows={25}
                      className={`${input} font-mono text-sm`}
                      placeholder={'# Правила игры\n\n## Формат\n\nОпишите формат игры...\n\n![схема маршрута](/uploads/pages/filename.jpg)'}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input type="checkbox" checked={rulesForm.is_published} onChange={e => setRulesForm({ ...rulesForm, is_published: e.target.checked })} />
                    Опубликовано
                  </label>
                  {rulesMsg && <p className={`text-sm ${rulesMsg === 'Сохранено' ? 'text-green-700' : 'text-red-600'}`}>{rulesMsg}</p>}
                  <button type="submit" className={btn}>Сохранить</button>
                </form>
              )
            }
          </div>
        </div>
      )}

      {tab === 'info' && (
        <div className="space-y-5">
          <p className="text-sm text-stone-500">
            Содержимое страницы <span className="font-medium text-stone-700">/info</span> — информация об организаторах и т.д. Поддерживаются переносы строк.
          </p>
          <div className={card}>
            {!infoLoaded
              ? <button className={btn} onClick={loadInfoPage}>Загрузить страницу</button>
              : (
                <form onSubmit={handleSaveInfo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Заголовок</label>
                    <input value={infoForm.title} onChange={e => setInfoForm({ ...infoForm, title: e.target.value })} className={input} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Содержимое
                      <span className="ml-2 text-xs font-normal text-stone-400">поддерживается Markdown — **жирный**, *курсив*, [ссылка](url), # заголовок</span>
                    </label>
                    <textarea
                      value={infoForm.content}
                      onChange={e => setInfoForm({ ...infoForm, content: e.target.value })}
                      rows={20}
                      className={`${input} font-mono text-sm`}
                      placeholder={'Пример:\n\n# О проекте\n\nТБИссектриса — городская игра.\n\n[Наш Telegram](https://t.me/example)\n\n**Контакты:** example@email.com'}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input type="checkbox" checked={infoForm.is_published} onChange={e => setInfoForm({ ...infoForm, is_published: e.target.checked })} />
                    Опубликовано
                  </label>
                  {infoMsg && <p className={`text-sm ${infoMsg === 'Сохранено' ? 'text-green-700' : 'text-red-600'}`}>{infoMsg}</p>}
                  <button type="submit" className={btn}>Сохранить</button>
                </form>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
