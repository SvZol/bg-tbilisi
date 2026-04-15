'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

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
  open:     { label: 'Открыта регистрация', cls: 'bg-red-100 text-red-700' },
  closed:   { label: 'Регистрация закрыта', cls: 'bg-stone-100 text-stone-500' },
  finished: { label: 'Завершено',           cls: 'bg-stone-100 text-stone-400' },
}

interface Post {
  id: string
  title: string
  content: string
  image_filename: string | null
  created_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
      <section className="relative h-[480px] overflow-hidden rounded-3xl">
        {/* Фото города */}
        <img
          src="/picture.PNG"
          alt="Тбилиси"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Лёгкий оверлей */}
        <div className="absolute inset-0 bg-white/30" />

        {/* Текст поверх */}
        <div className="absolute bottom-10 left-8">
          <p className="text-red-600 text-2xl font-bold leading-snug drop-shadow-sm max-w-lg">
            Городская семейная игра с элементами<br />ориентирования и математики
          </p>
          <Link
            href="/events"
            className="inline-block mt-5 bg-red-600 text-white font-bold px-7 py-3 rounded-xl hover:bg-red-700 transition-colors text-base"
          >
            Смотреть мероприятия →
          </Link>
        </div>
      </section>

      {/* Ближайшие мероприятия */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Ближайшие мероприятия</h2>
          <Link href="/events" className="text-red-600 hover:text-red-700 text-sm font-medium">
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
                className="group bg-white border border-stone-200 rounded-2xl p-5 hover:border-red-300 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-stone-900 text-lg mb-2 group-hover:text-red-600 transition-colors">
                  {event.title}
                </h3>
                <p className="text-stone-500 text-sm mb-4 line-clamp-2">{event.description}</p>
                <div className="text-xs text-stone-400 space-y-1 mb-3">
                  <p>{new Date(event.starts_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {event.status !== 'finished' && (
                    <p>Регистрация до {new Date(event.reg_deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                  )}
                </div>
                {(() => {
                  const st = statusMap[event.status] || statusMap.open
                  return (
                    <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${st.cls}`}>
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
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Новости</h2>
          <div className="space-y-5">
            {posts.slice(0, 3).map(post => (
              <div key={post.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                {post.image_filename && (
                  <img
                    src={`${API_URL}/uploads/${post.image_filename}`}
                    alt={post.title}
                    className="w-full h-52 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="font-bold text-stone-900 text-lg mb-2">{post.title}</h3>
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
