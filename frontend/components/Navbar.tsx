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
          <img src="/logo-icon.png.jpg" alt="" className="h-10 w-auto" />
          <div className="leading-none">
            <img src="/logo-text.png.jpg" alt="ТБИссектриса" className="h-7 w-auto" />
            <div className="text-[10px] text-stone-400 tracking-widest uppercase font-medium mt-0.5">
              Городская игра · Тбилиси
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/events" className="text-stone-600 hover:text-orange-600 font-medium transition-colors">
            Мероприятия
          </Link>
          <Link href="/info" className="text-stone-600 hover:text-orange-600 font-medium transition-colors">
            О проекте
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className="text-stone-600 hover:text-orange-600 font-medium transition-colors">
                Мои команды
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="text-stone-600 hover:text-orange-600 font-medium transition-colors">
                  Админ
                </Link>
              )}
              <span className="text-stone-400 hidden md:inline">{user.full_name}</span>
              <button onClick={handleSignOut} className="text-stone-400 hover:text-red-500 transition-colors">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-stone-600 hover:text-orange-600 font-medium transition-colors">
                Войти
              </Link>
              <Link href="/register"
                className="bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 font-medium transition-colors">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
