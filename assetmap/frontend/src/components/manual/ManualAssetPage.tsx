import { useState, useEffect, useCallback } from 'react'
import { Plus, Package, RefreshCw } from 'lucide-react'
import { api } from '../../services/api'
import { ManualAssetCard } from './ManualAssetCard'
import { AddAssetFlow } from './AddAssetFlow'

function fmt(paise: number) {
  const v = paise / 100
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}

export function ManualAssetPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [totalPaise, setTotalPaise] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAddFlow, setShowAddFlow] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const loadAssets = useCallback(async () => {
    try {
      const res = await api.get('/manual/assets')
      if (res.data?.success) {
        setAssets(res.data.data.assets)
        setSummary(res.data.data.summary)
        setTotalPaise(res.data.data.totalPaise)
      }
    } catch (err) {
      console.error('Failed to load manual assets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAssets() }, [loadAssets])

  const handleDelete = async (assetId: string) => {
    if (!confirm('Remove this asset?')) return
    try {
      await api.delete(`/manual/assets/${assetId}`)
      await loadAssets()
    } catch (err) {
      console.error('Failed to delete asset:', err)
    }
  }

  const handleUpdateValue = async (assetId: string) => {
    const newValue = prompt('Enter new value in ₹:')
    if (!newValue) return
    const paise = Math.round(parseFloat(newValue) * 100)
    if (isNaN(paise) || paise < 1) return alert('Please enter a valid amount')
    try {
      await api.post(`/manual/assets/${assetId}/update-value`, {
        newValuePaise: paise,
        valuationMethod: 'self_assessed',
      })
      await loadAssets()
    } catch (err) {
      console.error('Failed to update value:', err)
    }
  }

  // Get unique categories from assets
  const uniqueCategories = [...new Set(assets.map(a => a.asset_category))]
  const filteredAssets = filter === 'all'
    ? assets
    : assets.filter(a => a.asset_category === filter)

  // Category labels
  const CAT_LABELS: Record<string, string> = {
    GOLD_PHYSICAL: '🥇 Gold', VEHICLE: '🚗 Vehicles', RESIDENTIAL_PROPERTY: '🏠 Property',
    COMMERCIAL_PROPERTY: '🏢 Commercial', AGRICULTURAL_LAND: '🌾 Land', ART_COLLECTIBLE: '🎨 Art',
    OTHER_PHYSICAL: '📦 Other', CRYPTO: '₿ Crypto', FOREIGN_ASSET: '🌍 Foreign',
    UNLISTED_EQUITY: '📊 Unlisted', CHIT_FUND: '🏦 Chit Fund', MONEY_LENT: '🤝 Lent',
    CASH: '💵 Cash', OTHER_FINANCIAL: '💼 Other', BUSINESS_OWNERSHIP: '🏭 Business',
    INTELLECTUAL_PROPERTY: '💡 IP', OTHER_BUSINESS: '🏗️ Other',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="size-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            My Assets
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} worth {fmt(totalPaise)}
          </p>
        </div>
        <button
          onClick={() => setShowAddFlow(true)}
          className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-full text-sm font-medium transition active:scale-95 shadow-lg shadow-zinc-900/20 dark:shadow-none"
        >
          <Plus className="size-4" /> Add Asset
        </button>
      </div>

      {/* Category summary cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {Object.entries(summary).map(([cat, val]) => (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? 'all' : cat)}
              className={`text-left p-3.5 rounded-xl transition-all ${filter === cat
                  ? 'bg-zinc-900 dark:bg-white/15 text-white shadow-sm'
                  : 'bg-white dark:bg-[#1A1D27] border border-zinc-200/50 dark:border-[#2E3148] hover:border-zinc-300 dark:hover:border-[#3E4168]'
                }`}
            >
              <p className={`text-[11px] font-medium mb-1 ${filter === cat ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                {CAT_LABELS[cat] ?? cat}
              </p>
              <p className={`text-base font-semibold ${filter === cat ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'
                }`}>
                {fmt(val)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Filter chips */}
      {uniqueCategories.length > 1 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`shrink-0 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition active:scale-95 border ${filter === 'all'
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white/15 dark:border-white/15 dark:text-white'
                : 'bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 dark:bg-[#21253A] dark:border-[#2E3148] dark:text-zinc-300'
              }`}
          >
            All ({assets.length})
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? 'all' : cat)}
              className={`shrink-0 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition active:scale-95 border ${filter === cat
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white/15 dark:border-white/15 dark:text-white'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 dark:bg-[#21253A] dark:border-[#2E3148] dark:text-zinc-300'
                }`}
            >
              {CAT_LABELS[cat] ?? cat} ({assets.filter(a => a.asset_category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Asset grid */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map(asset => (
            <ManualAssetCard
              key={asset.id}
              asset={asset}
              onUpdateValue={handleUpdateValue}
              onDelete={handleDelete}
            />
          ))}
          {/* Add more card */}
          <button
            onClick={() => setShowAddFlow(true)}
            className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-[#2E3148] hover:border-zinc-400 dark:hover:border-[#4E5178] p-8 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition group min-h-[180px]"
          >
            <Plus className="size-8 group-hover:scale-110 transition" strokeWidth={1.5} />
            <span className="text-sm font-medium">Add another asset</span>
          </button>
        </div>
      ) : (
        <div className="text-center py-16">
          <Package className="size-14 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" strokeWidth={1.2} />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No manual assets yet
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 w-full max-w-[400px] mx-auto leading-relaxed">
            Add gold, vehicles, property, crypto, business ownership, or any other asset that can't be auto-discovered.
          </p>
          <button
            onClick={() => setShowAddFlow(true)}
            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 px-6 py-3 rounded-full text-sm font-medium transition active:scale-95"
          >
            <Plus className="size-4" /> Add your first asset
          </button>
        </div>
      )}

      {/* Add Asset Flow Modal */}
      {showAddFlow && (
        <AddAssetFlow
          onAdded={loadAssets}
          onClose={() => setShowAddFlow(false)}
        />
      )}
    </div>
  )
}
