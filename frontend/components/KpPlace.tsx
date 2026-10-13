export interface KpPlaceData {
  address_ru?: string | null
  address_en?: string | null
  object_note?: string | null
}

/** Где находится КП: адрес (рус / англ) и что на нём искать. Ничего не рисует, если адреса нет. */
export default function KpPlace({ place }: { place?: KpPlaceData | null }) {
  if (!place || (!place.address_ru && !place.address_en && !place.object_note)) return null
  return (
    <p className="px-4 py-2 border-t border-stone-100 text-xs text-stone-600 bg-white/60">
      <span className="mr-1">📍</span>
      {place.address_ru && <span className="font-medium text-stone-800">{place.address_ru}</span>}
      {place.address_en && <span className="text-stone-400"> · {place.address_en}</span>}
      {place.object_note && <span className="text-stone-500"> — {place.object_note}</span>}
    </p>
  )
}
