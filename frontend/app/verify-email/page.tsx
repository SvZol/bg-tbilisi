'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

function VerifyEmailContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Токен не найден в ссылке.'); return }
    api.post(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => { setStatus('ok'); setMessage(res.data.message || 'Email подтверждён!') })
      .catch(err => { setStatus('error'); setMessage(err?.response?.data?.detail || 'Ошибка подтверждения.') })
  }, [token])

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-10 shadow-sm">
      {status === 'loading' && (
        <>
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-stone-600">Проверяем ссылку...</p>
        </>
      )}
      {status === 'ok' && (
        <>
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-stone-900 mb-2">Готово!</h1>
          <p className="text-stone-600 mb-6">{message}</p>
          <Link href="/login"
            className="bg-orange-500 text-white px-8 py-2.5 rounded-xl hover:bg-orange-600 font-bold transition-colors">
            Войти
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-extrabold text-stone-900 mb-2">Ошибка</h1>
          <p className="text-stone-600 mb-6">{message}</p>
          <Link href="/login"
            className="text-orange-600 hover:text-orange-700 font-medium">
            На страницу входа
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <Suspense fallback={<div className="text-stone-500">Загрузка...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
