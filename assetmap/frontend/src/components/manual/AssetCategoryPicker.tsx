import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'

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
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="size-8 border-2 border-zinc-200 dark:border-white/20 border-t-lime-500 rounded-full animate-spin" />
      <span className="text-sm text-zinc-400">Loading categories…</span>
    </div>
  )

  const visibleCategories = categories.filter(
    c => groups[activeGroup]?.includes(c.category)
  )

  return (
    <div>
      {/* Group tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-100/80 dark:bg-white/5 rounded-2xl p-1 border border-zinc-200/40 dark:border-white/5">
        {(Object.keys(GROUP_LABELS) as GroupKey[]).map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
              activeGroup === g
                ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span className="mr-1">{GROUP_LABELS[g].emoji}</span>
            {GROUP_LABELS[g].label}
          </button>
        ))}
      </div>

      {/* Category list */}
      <div className="flex flex-col gap-2">
        {visibleCategories.map((cat: any) => (
          <button
            key={cat.category}
            onClick={() => onSelect(cat.category)}
            className="text-left flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-zinc-200/70 dark:border-white/8 bg-white dark:bg-white/[0.03] hover:border-lime-400/60 dark:hover:border-lime-500/30 hover:bg-gradient-to-r hover:from-lime-50/40 hover:to-transparent dark:hover:from-lime-500/5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200 group"
          >
            {/* Emoji icon */}
            <div className="shrink-0 w-11 h-11 flex items-center justify-center text-[24px] rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100/80 dark:border-white/5 group-hover:scale-110 group-hover:bg-lime-50 dark:group-hover:bg-lime-500/10 transition-all duration-200">
              {cat.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-lime-700 dark:group-hover:text-lime-400 transition-colors">
                {cat.label}
              </div>
              <div className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug truncate">
                {cat.description}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="shrink-0 size-4 text-zinc-300 dark:text-zinc-600 group-hover:text-lime-500 group-hover:translate-x-0.5 transition-all duration-200" />
          </button>
        ))}
      </div>
    </div>
  )
}
