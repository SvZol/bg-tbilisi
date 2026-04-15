'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

interface KpResult {
  kp_number: number
  zadanie?: { text: string; correct_answer: string | null; team_answer: string | null; points_earned: number; image_filename?: string | null }
  zadacha?: { text: string; correct_answer: string | null; team_answer: string | null; points_earned: number; image_filename?: string | null }
}

interface TeamInfo { id: string; name: string; event_id: string }

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Тип и цвет КП по номеру
function kpMeta(num: number) {
  const b = num < 100 ? num : num - 100
  if (b === 0)          return { border: 'border-yellow-400', bg: 'bg-yellow-50',  label: 'bg-yellow-400', text: 'text-yellow-800', name: 'Старт' }
  if (b >= 1 && b <=19) return { border: 'border-red-400', bg: 'bg-red-50',  label: 'bg-red-600', text: 'text-white',       name: 'КП' }
  if (b >= 21 && b<=29) return { border: 'border-blue-400',   bg: 'bg-blue-50',    label: 'bg-blue-500',   text: 'text-white',       name: 'КП↕' }
  if (b >= 31 && b<=39) return { border: 'border-green-400',  bg: 'bg-green-50',   label: 'bg-green-600',  text: 'text-white',       name: 'Фото' }
  if (b === 99)         return { border: 'border-yellow-400', bg: 'bg-yellow-50',  label: 'bg-yellow-400', text: 'text-yellow-800',  name: 'Финиш' }
  return                       { border: 'border-stone-300',  bg: 'bg-white',      label: 'bg-stone-700',  text: 'text-white',       name: 'КП' }
}

function AnswerRow({ label, item, isTask }: {
  label: string
  item: NonNullable<KpResult['zadanie']>
  isTask?: boolean
}) {
  const ok = item.points_earned > 0
  return (
    <div className={`px-4 py-3 ${isTask ? 'bg-violet-50/50 border-t border-violet-100' : 'border-t border-stone-100'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1 ${
            isTask ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-800'
          }`}>{label}</span>
          <p className="text-sm text-stone-800 leading-snug">{item.text.replace(/^Задача: /, '')}</p>
          {item.image_filename && (
            <img src={`${API}/uploads/${item.image_filename}`} alt=""
              className="mt-2 rounded-lg max-h-40 object-contain border border-stone-200" />
          )}
        </div>
        {/* Ответы */}
        <div className="shrink-0 flex items-center gap-3 mt-4">
          <div className="text-right">
            <p className="text-[10px] text-stone-400 mb-0.5">Ваш</p>
            <p className={`text-sm font-semibold ${ok ? 'text-stone-800' : 'text-stone-500'}`}>
              {item.team_answer ?? <span className="italic font-normal text-stone-400">—</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-red-600 mb-0.5">Ответ</p>
            <p className="text-sm font-semibold text-red-700">{item.correct_answer ?? '—'}</p>
          </div>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="text-base">{ok ? '✓' : '✗'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamResultsPage() {
  const { id } = useParams()
  const [team, setTeam] = useState<TeamInfo | null>(null)
  const [results, setResults] = useState<KpResult[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([api.get(`/teams/${id}/public`), api.get(`/teams/${id}/results`)])
      .then(([t, r]) => { setTeam(t.data); setResults(r.data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-stone-500 p-8">Загрузка...</p>
  if (notFound || !team) return (
    <div className="text-center py-16">
      <p className="text-stone-500">Команда не найдена или результаты ещё не опубликованы.</p>
    </div>
  )

  const totalPts   = results.reduce((s, r) => s + (r.zadanie?.points_earned ?? 0) + (r.zadacha?.points_earned ?? 0), 0)
  const zadCount   = results.filter(r => r.zadanie).length
  const zadOk      = results.filter(r => (r.zadanie?.points_earned ?? 0) > 0).length
  const taskCount  = results.filter(r => r.zadacha).length
  const taskOk     = results.filter(r => (r.zadacha?.points_earned ?? 0) > 0).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Шапка */}
      <div>
        <Link href={`/events/${team.event_id}`} className="text-sm text-stone-400 hover:text-red-700 transition-colors">
          ← К мероприятию
        </Link>
        <h1 className="text-2xl font-extrabold text-stone-900 mt-2">{team.name}</h1>
      </div>

      {results.length === 0 ? (
        <div className="border-2 border-dashed border-stone-200 rounded-2xl p-10 text-center text-stone-400">
          Результаты ещё не опубликованы
        </div>
      ) : (
        <>
          {/* Итог */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-extrabold text-red-700">{totalPts}</p>
              <p className="text-xs text-stone-500 mt-1">Всего очков</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-stone-800">
                {zadOk}<span className="text-stone-400 text-lg font-normal">/{zadCount}</span>
              </p>
              <p className="text-xs text-stone-500 mt-1">Заданий взято</p>
            </div>
            {taskCount > 0 && (
              <div>
                <p className="text-3xl font-extrabold text-violet-700">
                  {taskOk}<span className="text-stone-400 text-lg font-normal">/{taskCount}</span>
                </p>
                <p className="text-xs text-stone-500 mt-1">Задач решено</p>
              </div>
            )}
          </div>

          {/* Список КП */}
          <div className="space-y-3">
            {results.map(row => {
              const base = row.kp_number
              const meta = kpMeta(base)
              const kpTotal = (row.zadanie?.points_earned ?? 0) + (row.zadacha?.points_earned ?? 0)
              return (
                <div key={row.kp_number} className={`rounded-2xl border-2 overflow-hidden ${meta.border}`}>
                  {/* Заголовок КП */}
                  <div className={`px-4 py-2 flex items-center gap-2 ${meta.bg}`}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.label} ${meta.text}`}>
                      КП-{String(base).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">{meta.name}</span>
                    <span className="ml-auto text-sm font-bold text-stone-700">{kpTotal} очк.</span>
                  </div>
                  {/* Задание + Задача */}
                  {row.zadanie && <AnswerRow label="Задание" item={row.zadanie} />}
                  {row.zadacha && <AnswerRow label="Задача" item={row.zadacha} isTask />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
