'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import LogoMark from '@/components/LogoMark'

const input = "w-full border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { refresh } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      await refresh()
      router.push('/')
    } catch {
      setError('Неверный email или пароль')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="flex justify-center mb-8">
        <LogoMark size="md" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-7 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={input} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 font-bold disabled:opacity-50 transition-colors">
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
          <p className="text-right">
            <Link href="/forgot-password" className="text-sm text-stone-400 hover:text-red-700 transition-colors">
              Забыли пароль?
            </Link>
          </p>
        </form>
        <p className="mt-5 text-sm text-stone-600 text-center">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-red-700 hover:text-red-800 font-medium">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
