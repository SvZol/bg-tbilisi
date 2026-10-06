'use client'
import { useState } from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/** Поле пароля с кнопкой «показать / скрыть». */
export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        title={visible ? 'Скрыть пароль' : 'Показать пароль'}
        className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-700"
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  )
}
