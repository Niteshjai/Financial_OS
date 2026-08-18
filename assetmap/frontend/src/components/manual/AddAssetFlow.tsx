import { useState } from 'react'
import { AssetCategoryPicker } from './AssetCategoryPicker'
import { AssetForm } from './AssetForm'
import { api } from '../../services/api'
import { X, CheckCircle2, Plus } from 'lucide-react'

type Step = 'category' | 'form' | 'done'

interface Props {
  onAdded: () => void
  onClose: () => void
}

export function AddAssetFlow({ onAdded, onClose }: Props) {
  const [step, setStep] = useState<Step>('category')
  const [category, setCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCategorySelect = (cat: string) => {
    setCategory(cat)
    setStep('form')
  }

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/manual/assets', {
        ...formData,
        assetCategory: category,
      })
      if (res.data?.success) {
        setStep('done')
      } else {
        throw new Error(res.data?.error?.message || 'Failed to create asset')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1A1D27] rounded-[20px] w-full max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-black/10 dark:shadow-black/40 border border-zinc-200/60 dark:border-white/10 animate-in zoom-in-95 slide-in-from-bottom-3 fade-in duration-300">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {step === 'category' ? 'Add an asset' :
               step === 'form' ? 'Enter details' :
               'Asset added!'}
            </h2>
            {step === 'form' && category && (
              <button
                onClick={() => { setStep('category'); setError('') }}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition mt-0.5 font-medium"
              >
                ← Change category
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/20 transition-all active:scale-90"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className={`p-5 overflow-y-auto custom-scrollbar ${step === 'category' ? 'h-[520px]' : ''}`}>
          {step === 'category' && (
            <AssetCategoryPicker onSelect={handleCategorySelect} />
          )}

          {step === 'form' && category && (
            <AssetForm
              category={category}
              onSubmit={handleSubmit}
              isLoading={loading}
              error={error}
            />
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="relative inline-block mb-5">
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
                <CheckCircle2 className="relative size-16 text-emerald-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Asset added to your net worth
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed max-w-[280px] mx-auto">
                We'll remind you to update its value every 90 days to keep your net worth accurate.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setStep('category')
                    setCategory(null)
                    setError('')
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition active:scale-95"
                >
                  <Plus className="size-4" /> Add another
                </button>
                <button
                  onClick={() => { onAdded(); onClose() }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
