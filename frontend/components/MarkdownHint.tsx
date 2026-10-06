/** Памятка по разметке для редакторов новостей и страниц. */
export default function MarkdownHint() {
  const rows: [string, string][] = [
    ['[текст ссылки](https://example.com)', 'ссылка'],
    ['**жирный**  и  *курсив*', 'выделение'],
    ['# Заголовок   ## Подзаголовок', 'заголовки'],
    ['- пункт списка', 'список (каждый пункт с новой строки)'],
    ['![описание](https://адрес-картинки)', 'картинка в тексте'],
    ['пустая строка между абзацами', 'новый абзац'],
  ]
  return (
    <details className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
      <summary className="cursor-pointer font-medium text-stone-600">Как оформлять текст (ссылки, выделение, списки)</summary>
      <table className="mt-2 w-full">
        <tbody>
          {rows.map(([code, label]) => (
            <tr key={code}>
              <td className="py-0.5 pr-3 font-mono text-stone-700 whitespace-pre-wrap">{code}</td>
              <td className="py-0.5">{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
