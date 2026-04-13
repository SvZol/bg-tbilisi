// Логотип ТБИссектрисы — используется на страницах входа/регистрации и везде без навбара

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function LogoMark({ size = 'md' }: LogoMarkProps) {
  const scales = { sm: 0.7, md: 1, lg: 1.4 }
  const s = scales[size]
  const svgW = Math.round(44 * s)
  const svgH = Math.round(36 * s)
  const titleSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl'
  const subSize   = size === 'lg' ? 'text-xs' : 'text-[10px]'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <svg width={svgW} height={svgH} viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <div className="leading-none">
          <div className={`font-extrabold tracking-tight ${titleSize}`}>
            <span className="text-red-600">ТБИ</span><span className="text-stone-900">ссектриса</span>
          </div>
        </div>
      </div>
      <p className={`${subSize} text-stone-400 tracking-widest uppercase font-medium`}>
        Городская игра · Тбилиси
      </p>
    </div>
  )
}
