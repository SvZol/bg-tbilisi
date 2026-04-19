'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const input = "w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
const btn = "bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  useEffect(() => {
    if (user) setProfileForm({ full_name: user.full_name || '', phone: user.phone || '' })
  }, [user])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(''); setProfileLoading(true)
    try {
      await api.patch('/auth/me', profileForm)
      setProfileMsg('Сохранено')
    } catch (err: any) {
      setProfileMsg(err?.response?.data?.detail || 'Ошибка')
    } finally { setProfileLoading(false) }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg('')
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg('Пароли не совпадают'); return
    }
    setPwLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      setPwMsg('Пароль успешно изменён')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err: any) {
      setPwMsg(err?.response?.data?.detail || 'Ошибка')
    } finally { setPwLoading(false) }
  }

  if (loading || !user) return <p className="text-stone-500">Загрузка...</p>

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-3xl font-extrabold text-stone-900">Профиль</h1>

      {/* Данные профиля */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-stone-900">Личные данные</h2>
        <p className="text-sm text-stone-500">{user.email}</p>
        <form onSubmit={handleProfileSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Имя и фамилия</label>
            <input value={profileForm.full_name}
              onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className={input} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Телефон</label>
            <input value={profileForm.phone}
              onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className={input} placeholder="+995 (999) 99-99-99" />
          </div>
          {profileMsg && (
            <p className={`text-sm font-medium ${profileMsg === 'Сохранено' ? 'text-green-700' : 'text-red-600'}`}>
              {profileMsg}
            </p>
          )}
          <button type="submit" disabled={profileLoading} className={btn}>
            {profileLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Смена пароля */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-stone-900">Смена пароля</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Текущий пароль</label>
            <input type="password" value={pwForm.current_password}
              onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
              className={input} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Новый пароль</label>
            <input type="password" value={pwForm.new_password}
              onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
              className={input} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Повторите новый пароль</label>
            <input type="password" value={pwForm.confirm}
              onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
              className={input} required />
          </div>
          {pwMsg && (
            <p className={`text-sm font-medium ${pwMsg.includes('успешно') ? 'text-green-700' : 'text-red-600'}`}>
              {pwMsg}
            </p>
          )}
          <button type="submit" disabled={pwLoading} className={btn}>
            {pwLoading ? 'Сохранение...' : 'Изменить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}
