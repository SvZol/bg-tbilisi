'use client'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  function handleSignOut() {
    signOut()
    router.push('/')
  }

  return (
    <nav className="bg-white border-b-2 border-orange-100">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo-icon.PNG" alt="" className="h-12 w-auto" />
          <img src="/logo-text.PNG" alt="ТБИссектриса" className="h-10 w-auto" />
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/events" className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
            Мероприятия
          </Link>
          <Link href="/info" className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
            О проекте
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
                Мои команды
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
                  Админ
                </Link>
              )}
              <span className="text-stone-400 hidden md:inline text-sm">{user.full_name}</span>
              <button onClick={handleSignOut} className="text-stone-400 hover:text-red-500 transition-colors text-sm uppercase tracking-wide">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-stone-700 hover:text-red-600 font-medium transition-colors uppercase text-sm tracking-wide">
                Войти
              </Link>
              <Link href="/register"
                className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 font-medium transition-colors uppercase text-sm tracking-wide">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
