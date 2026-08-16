import { useState, useEffect } from 'react'

type GroupKey = 'physical' | 'financial' | 'business'

const GROUP_LABELS: Record<GroupKey, { label: string; emoji: string }> = {
  physical:  { label: 'Physical assets', emoji: '🏠' },
  financial: { label: 'Financial assets', emoji: '💰' },
  business:  { label: 'Business assets', emoji: '🏭' },
}

interface Props {
  onSelect: (category: string) => void
}

export function AssetCategoryPicker({ onSelect }: Props) {
  const [categories, setCategories] = useState<any[]>([])
  const [groups, setGroups] = useState<any>({})
  const [activeGroup, setActiveGroup] = useState<GroupKey>('physical')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/manual/')
      .then(r => r.json())
      .then(d => {
        setCategories(d.data.categories)
        setGroups(d.data.groups)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="text-center py-10 text-zinc-400 text-sm">Loading categories...</div>
  )

  const visibleCategories = categories.filter(
    c => groups[activeGroup]?.includes(c.category)
  )

  return (
    <div>
      {/* Group tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-100 dark:bg-white/5 rounded-xl p-1 border border-zinc-200/50 dark:border-white/10">
        {(Object.keys(GROUP_LABELS) as GroupKey[]).map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              activeGroup === g
                ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {GROUP_LABELS[g].emoji} {GROUP_LABELS[g].label}
          </button>
        ))}
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visibleCategories.map((cat: any) => (
          <button
            key={cat.category}
            onClick={() => onSelect(cat.category)}
            className="text-left p-3.5 rounded-xl border border-zinc-200/60 dark:border-white/10 bg-white dark:bg-white/5 hover:border-zinc-400 dark:hover:border-white/20 hover:shadow-sm transition-all group"
          >
            <div className="text-2xl mb-2">{cat.emoji}</div>
            <div className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5 group-hover:text-zinc-950 dark:group-hover:text-white">
              {cat.label}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
              {cat.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
