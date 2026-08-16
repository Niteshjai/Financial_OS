import { Trash2, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  asset: any
  onUpdateValue?: (assetId: string) => void
  onDelete?: (assetId: string) => void
}

const CATEGORY_EMOJIS: Record<string, string> = {
  GOLD_PHYSICAL: '🥇', VEHICLE: '🚗', RESIDENTIAL_PROPERTY: '🏠',
  COMMERCIAL_PROPERTY: '🏢', AGRICULTURAL_LAND: '🌾', ART_COLLECTIBLE: '🎨',
  OTHER_PHYSICAL: '📦', CRYPTO: '₿', FOREIGN_ASSET: '🌍',
  UNLISTED_EQUITY: '📊', CHIT_FUND: '🏦', MONEY_LENT: '🤝',
  CASH: '💵', OTHER_FINANCIAL: '💼', BUSINESS_OWNERSHIP: '🏭',
  INTELLECTUAL_PROPERTY: '💡', OTHER_BUSINESS: '🏗️',
}

const CATEGORY_COLORS: Record<string, string> = {
  GOLD_PHYSICAL: 'bg-amber-100 dark:bg-amber-400/10',
  VEHICLE: 'bg-slate-100 dark:bg-slate-400/10',
  RESIDENTIAL_PROPERTY: 'bg-emerald-100 dark:bg-emerald-400/10',
  COMMERCIAL_PROPERTY: 'bg-blue-100 dark:bg-blue-400/10',
  AGRICULTURAL_LAND: 'bg-green-100 dark:bg-green-400/10',
  ART_COLLECTIBLE: 'bg-amber-50 dark:bg-amber-400/10',
  CRYPTO: 'bg-orange-100 dark:bg-orange-400/10',
  FOREIGN_ASSET: 'bg-sky-100 dark:bg-sky-400/10',
  UNLISTED_EQUITY: 'bg-purple-100 dark:bg-purple-400/10',
  MONEY_LENT: 'bg-yellow-100 dark:bg-yellow-400/10',
  BUSINESS_OWNERSHIP: 'bg-zinc-100 dark:bg-white/5',
}

function fmt(paise: number) {
  const v = paise / 100
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}

export function ManualAssetCard({ asset, onUpdateValue, onDelete }: Props) {
  const emoji = CATEGORY_EMOJIS[asset.asset_category] ?? '📦'
  const bgColor = CATEGORY_COLORS[asset.asset_category] ?? 'bg-zinc-100 dark:bg-white/5'

  const gainLoss = asset.purchase_value_paise
    ? asset.current_value_paise - asset.purchase_value_paise
    : null

  const daysUntilUpdate = asset.next_valuation_date
    ? Math.ceil((new Date(asset.next_valuation_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isOverdue = daysUntilUpdate !== null && daysUntilUpdate < 0

  return (
    <article className="bg-white dark:bg-[#1A1D27] rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer border border-transparent dark:border-[#2E3148] group relative">
      {/* Top row: icon + category tag */}
      <div className="flex items-start justify-between mb-3">
        <div className={`size-12 rounded-xl ${bgColor} grid place-items-center text-xl`}>
          {emoji}
        </div>
        <div className="flex items-center gap-1.5">
          {isOverdue && (
            <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5">
              Update due
            </span>
          )}
          {asset.ai_risk_level && (
            <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${
              asset.ai_risk_level === 'very_low' || asset.ai_risk_level === 'low'
                ? 'bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400'
                : asset.ai_risk_level === 'medium'
                ? 'bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-400/10 text-red-700 dark:text-red-400'
            }`}>
              {asset.ai_risk_level.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5 capitalize">
        {asset.asset_category.replace(/_/g, ' ').toLowerCase()}
      </p>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight mb-3 line-clamp-1">
        {asset.ai_category_label || asset.asset_name}
      </h3>

      {/* Value */}
      <p className="text-[19px] font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">
        {fmt(asset.current_value_paise)}
      </p>

      {/* Encumbrance */}
      {asset.is_encumbered && asset.encumbrance_amount_paise > 0 && (
        <p className="text-[11px] text-red-500 mt-0.5">
          Loan: {fmt(asset.encumbrance_amount_paise)} outstanding
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-[#2E3148] flex items-center justify-between">
        {gainLoss !== null ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            gainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {gainLoss >= 0
              ? <TrendingUp className="size-3.5" />
              : <TrendingDown className="size-3.5" />
            }
            {gainLoss >= 0 ? '+' : ''}{fmt(Math.abs(gainLoss))}
          </div>
        ) : (
          <div className="flex -space-x-0.5">
            <span className="size-2 rounded-full bg-sky-400" />
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="size-2 rounded-full bg-amber-400" />
          </div>
        )}

        <div className="flex items-center gap-1">
          {onUpdateValue && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateValue(asset.id) }}
              className="text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
            >
              Update
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(asset.id) }}
              className="text-zinc-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
            {new Date(asset.updated_at || asset.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </article>
  )
}
