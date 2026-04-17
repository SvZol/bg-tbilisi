interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function LogoMark({ size = 'md' }: LogoMarkProps) {
  const iconH = size === 'lg' ? 'h-20' : size === 'sm' ? 'h-10' : 'h-14'
  const textH = size === 'lg' ? 'h-10' : size === 'sm' ? 'h-5' : 'h-7'
  const subSize = size === 'lg' ? 'text-sm' : 'text-[10px]'

  return (
    <div className="flex flex-col items-center gap-2">
      <img src="/logo-icon.png" alt="" className={`${iconH} w-auto`} />
      <img src="/logo-text.png" alt="ТБИссектриса" className={`${textH} w-auto`} />
      <p className={`${subSize} text-stone-400 tracking-widest uppercase font-medium`}>
        Городская семейная игра · Тбилиси
      </p>
    </div>
  )
}
