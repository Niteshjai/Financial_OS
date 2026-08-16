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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1A1D27] rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-auto shadow-2xl border border-zinc-200/50 dark:border-[#2E3148]">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md px-6 py-4 border-b border-zinc-100 dark:border-[#2E3148] flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {step === 'category' ? 'Add an asset' :
               step === 'form' ? 'Enter details' :
               'Asset added!'}
            </h2>
            {step === 'form' && category && (
              <button
                onClick={() => { setStep('category'); setError('') }}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
              >
                ← Change category
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/15 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
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
            <div className="text-center py-6">
              <CheckCircle2 className="size-14 text-emerald-500 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Asset added to your net worth
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed max-w-xs mx-auto">
                We'll remind you to update its value every 90 days to keep your net worth accurate.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setStep('category')
                    setCategory(null)
                    setError('')
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-[#2E3148] text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition active:scale-95"
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
