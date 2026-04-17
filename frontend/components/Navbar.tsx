'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSignOut() {
    signOut()
    router.push('/')
    setOpen(false)
  }

  const links = (
    <>
      <Link href="/events" onClick={() => setOpen(false)}
        className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
        Мероприятия
      </Link>
      <Link href="/info" onClick={() => setOpen(false)}
        className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
        О проекте
      </Link>
      {user ? (
        <>
          <Link href="/dashboard" onClick={() => setOpen(false)}
            className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
            Мои команды
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
              Админ
            </Link>
          )}
          <span className="text-stone-400 text-sm hidden md:inline">{user.full_name}</span>
          <button onClick={handleSignOut}
            className="text-stone-400 hover:text-red-500 transition-colors text-sm uppercase tracking-wide text-left">
            Выйти
          </button>
        </>
      ) : (
        <>
          <Link href="/login" onClick={() => setOpen(false)}
            className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
            Войти
          </Link>
          <Link href="/register" onClick={() => setOpen(false)}
            className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 font-medium transition-colors uppercase text-sm tracking-wide text-center">
            Регистрация
          </Link>
        </>
      )}
    </>
  )

  return (
    <nav className="bg-white border-b-2 border-red-100">
      <div className="max-w-5xl mx-auto px-4">
        {/* Десктоп */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo-icon.png" alt="" className="h-10 w-auto" />
            <img src="/logo-text.png" alt="ТБИссектриса" className="h-16 w-auto" />
          </Link>
          <div className="flex items-center gap-5 text-sm flex-wrap justify-end">
            {links}
          </div>
        </div>

        {/* Мобильный — верхняя строка */}
        <div className="flex md:hidden items-center justify-between py-2">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <img src="/logo-icon.png" alt="" className="h-10 w-auto" />
            <img src="/logo-text.png" alt="ТБИссектриса" className="h-16 w-auto" />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-stone-700 hover:text-red-600 transition-colors"
            aria-label="Меню"
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Мобильное меню */}
        {open && (
          <div className="md:hidden flex flex-col gap-3 pb-4 border-t border-stone-100 pt-3">
            {links}
          </div>
        )}
      </div>
    </nav>
  )
}
