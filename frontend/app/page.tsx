'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import LogoMark from '@/components/LogoMark'

interface Event {
  id: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  reg_deadline: string
  status: string
}

const statusMap: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Открыта регистрация', cls: 'bg-green-100 text-green-700' },
  closed:   { label: 'Регистрация закрыта', cls: 'bg-amber-100 text-amber-700' },
  finished: { label: 'Завершено',           cls: 'bg-stone-100 text-stone-500' },
}

interface Post {
  id: string
  title: string
  content: string
  image_filename: string | null
  created_at: string
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    api.get('/events/').then(res => setEvents(res.data)).catch(() => {})
    api.get('/admin/posts/public').then(res => setPosts(res.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 to-amber-400 px-8 py-16 text-white">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo-icon.png.jpg" alt="" className="h-16 w-auto drop-shadow-lg" />
            <img src="/logo-text.png.jpg" alt="ТБИссектриса" className="h-10 w-auto brightness-0 invert" />
          </div>
          <p className="text-orange-100 text-lg mb-8 leading-relaxed">
            Городская семейная игра с элементами ориентирования и математики
          </p>
          <Link
            href="/events"
            className="inline-block bg-white text-orange-600 font-bold px-7 py-3 rounded-2xl hover:bg-orange-50 transition-colors text-base"
          >
            Смотреть мероприятия →
          </Link>
        </div>
        {/* Decorative circles */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-white opacity-5 rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute right-16 bottom-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/3" />
      </section>

      {/* Ближайшие мероприятия */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-800">Ближайшие мероприятия</h2>
          <Link href="/events" className="text-orange-500 hover:text-orange-700 text-sm font-medium">
            Все →
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
            Открытых мероприятий пока нет
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.slice(0, 3).map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group bg-white border border-stone-200 rounded-2xl p-5 hover:border-orange-300 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-3">🗺️</div>
                <h3 className="font-bold text-stone-800 text-lg mb-2 group-hover:text-orange-600 transition-colors">
                  {event.title}
                </h3>
                <p className="text-stone-500 text-sm mb-4 line-clamp-2">{event.description}</p>
                <div className="text-xs text-stone-400 space-y-1">
                  <p>📅 {new Date(event.starts_at).toLocaleDateString('ru-RU')}</p>
                  {event.status !== 'finished' && (
                    <p>⏰ Регистрация до {new Date(event.reg_deadline).toLocaleDateString('ru-RU')}</p>
                  )}
                </div>
                {(() => {
                  const st = statusMap[event.status] || statusMap.open
                  return (
                    <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  )
                })()}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Новости */}
      {posts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-stone-800 mb-6">Новости</h2>
          <div className="space-y-5">
            {posts.slice(0, 3).map(post => (
              <div key={post.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                {post.image_filename && (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/${post.image_filename}`}
                    alt={post.title}
                    className="w-full h-52 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="font-bold text-stone-800 text-lg mb-2">{post.title}</h3>
                  <p className="text-stone-600 line-clamp-3 text-sm leading-relaxed">{post.content}</p>
                  <p className="text-xs text-stone-400 mt-3">
                    {new Date(post.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
