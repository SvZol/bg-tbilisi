'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export default function InfoPage() {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api.get('/admin/public/pages/info')
      .then(res => setPage(res.data))
      .catch(() => setNotFound(true))
  }, [])

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-stone-400 text-lg">Страница пока не заполнена администратором.</p>
      </div>
    )
  }

  if (!page) return <p className="text-stone-500">Загрузка...</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-stone-900">{page.title}</h1>
      <div className="prose prose-stone max-w-none">
        {page.content.split('\n').map((line, i) => (
          line.trim() === ''
            ? <div key={i} className="h-3" />
            : <p key={i} className="text-stone-700 leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  )
}
