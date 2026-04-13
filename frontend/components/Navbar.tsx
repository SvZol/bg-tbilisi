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
        <Link href="/" className="flex items-center gap-3 group">
          {/* Три мешочка — SVG-иконка */}
          <svg width="44" height="36" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* жёлтый */}
            <ellipse cx="18" cy="26" rx="10" ry="7" fill="#FACC15" stroke="#111" strokeWidth="1.5"/>
            <path d="M14 20 Q18 14 22 20" stroke="#111" strokeWidth="1.5" fill="none"/>
            <circle cx="18" cy="18.5" r="2" fill="#FACC15" stroke="#111" strokeWidth="1.2"/>
            {/* голубой */}
            <ellipse cx="32" cy="27" rx="9" ry="6.5" fill="#38BDF8" stroke="#111" strokeWidth="1.5"/>
            <path d="M28 21.5 Q32 16 36 21.5" stroke="#111" strokeWidth="1.5" fill="none"/>
            <circle cx="32" cy="20" r="2" fill="#38BDF8" stroke="#111" strokeWidth="1.2"/>
            {/* красный — поверх */}
            <ellipse cx="22" cy="28" rx="10" ry="7" fill="#F87171" stroke="#111" strokeWidth="1.5"/>
            <path d="M18 22 Q22 15.5 26 22" stroke="#111" strokeWidth="1.5" fill="none"/>
            <circle cx="22" cy="20" r="2.2" fill="#F87171" stroke="#111" strokeWidth="1.2"/>
          </svg>

          {/* Текст логотипа */}
          <div className="leading-none">
            <div className="font-extrabold text-lg tracking-tight">
              <span className="text-red-600">ТБИ</span><span className="text-stone-900">ссектриса</span>
            </div>
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
