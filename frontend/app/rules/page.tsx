'use client'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function RulesPage() {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api.get('/admin/public/pages/rules')
      .then(res => setPage(res.data))
      .catch(() => setNotFound(true))
  }, [])

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-stone-400 text-lg">Правила пока не опубликованы.</p>
      </div>
    )
  }

  if (!page) return <p className="text-stone-500">Загрузка...</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-stone-900">{page.title}</h1>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => <p className="text-stone-700 leading-relaxed mb-3">{children}</p>,
          h1: ({ children }) => <h2 className="text-2xl font-bold text-stone-900 mt-6 mb-2">{children}</h2>,
          h2: ({ children }) => <h3 className="text-xl font-bold text-stone-900 mt-5 mb-2">{children}</h3>,
          h3: ({ children }) => <h4 className="text-lg font-semibold text-stone-800 mt-4 mb-1">{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="text-red-700 hover:text-red-800 underline underline-offset-2">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-stone-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-stone-700">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="border-stone-200 my-6" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-red-300 pl-4 italic text-stone-600 my-3">{children}</blockquote>
          ),
          img: ({ src, alt }) => (
            <a href={src} target="_blank" rel="noreferrer" className="block my-4">
              <img
                src={src?.startsWith('/uploads') ? `${API_URL}${src}` : src}
                alt={alt || ''}
                loading="lazy"
                className="rounded-2xl max-w-full border border-stone-200 cursor-zoom-in"
              />
            </a>
          ),
        }}
      >
        {page.content}
      </ReactMarkdown>
    </div>
  )
}
