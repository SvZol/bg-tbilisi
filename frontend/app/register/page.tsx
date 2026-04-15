'use client'
import { useState } from 'react'
import Link from 'next/link'
import { register } from '@/lib/auth'
import LogoMark from '@/components/LogoMark'

const input = "w-full border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await register(form.email, form.password, form.full_name, form.phone)
      setDone(true)
    } catch {
      setError('Ошибка регистрации. Возможно, этот email уже используется.')
    } finally { setLoading(false) }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="bg-white border border-stone-200 rounded-2xl p-10 shadow-sm">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-extrabold text-stone-900 mb-3">Почти готово!</h1>
          <p className="text-stone-600 mb-2">
            На <strong>{form.email}</strong> отправлено письмо с ссылкой для подтверждения.
          </p>
          <p className="text-stone-400 text-sm mb-6">
            Проверьте папку «Спам», если не видите письмо.
          </p>
          <Link href="/login"
            className="text-red-700 hover:text-red-800 font-medium text-sm">
            Уже подтвердили? Войти →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="flex justify-center mb-8">
        <LogoMark size="md" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-7 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Имя и фамилия</label>
            <input name="full_name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className={input} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={input} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Телефон <span className="text-stone-400 font-normal">(необязательно)</span></label>
            <input name="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Пароль</label>
            <input type="password" name="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={input} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 font-bold disabled:opacity-50 transition-colors">
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="mt-5 text-sm text-stone-600 text-center">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-red-700 hover:text-red-800 font-medium">Войти</Link>
        </p>
      </div>
    </div>
  )
}
