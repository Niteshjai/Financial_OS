import { useState, useEffect } from 'react'

interface Props {
  category: string
  onSubmit: (data: any) => void
  isLoading: boolean
  error: string
}

export function AssetForm({ category, onSubmit, isLoading, error }: Props) {
  const [catConfig, setCatConfig] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    fetch('/api/manual/')
      .then(r => r.json())
      .then(d => {
        const cat = d.data.categories.find((c: any) => c.category === category)
        setCatConfig(cat)
      })
  }, [category])

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const setExtra = (key: string, value: any) =>
    setExtraFields(prev => ({ ...prev, [key]: value }))

  const handleSubmit = () => {
    setValidationError('')

    if (!form.assetName?.trim()) {
      setValidationError('Please enter a name for this asset')
      return
    }
    if (!form.currentValueRupees || parseFloat(form.currentValueRupees) < 1) {
      setValidationError('Please enter the current value')
      return
    }

    // Validate required extra fields
    const missing = catConfig?.extraFields
      ?.filter((f: any) => f.required && !extraFields[f.key] && extraFields[f.key] !== false)
      .map((f: any) => f.label)

    if (missing?.length > 0) {
      setValidationError(`Please fill in: ${missing.join(', ')}`)
      return
    }

    onSubmit({
      assetName:          form.assetName,
      description:        form.description,
      currentValuePaise:  Math.round(parseFloat(form.currentValueRupees) * 100),
      purchaseValuePaise: form.purchaseValueRupees
        ? Math.round(parseFloat(form.purchaseValueRupees) * 100)
        : undefined,
      purchaseDate:       form.purchaseDate || undefined,
      valuationMethod:    form.valuationMethod ?? 'self_assessed',
      extraFields,
      notes:              form.notes || undefined,
      tags:               [],
      includeInNetworth:  form.includeInNetworth ?? true,
      isEncumbered:       extraFields.loan_outstanding === true ||
                          extraFields.has_home_loan === true,
    })
  }

  if (!catConfig) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="size-6 border-2 border-zinc-200 dark:border-white/20 border-t-lime-500 rounded-full animate-spin" />
      <span className="text-sm text-zinc-400">Loading form…</span>
    </div>
  )

  const inputBase = "w-full px-3.5 py-2.5 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-white/[0.02] text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-lime-500 dark:focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 dark:focus:ring-lime-500/5 transition-all duration-200 placeholder:text-zinc-400/70"
  const selectClass = `${inputBase} appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10`
  const labelClass = "text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 block tracking-wide"

  return (
    <div className="space-y-4.5 animate-in fade-in duration-200">
      {/* Asset name */}
      <div>
        <label className={labelClass}>{catConfig.emoji} Asset name *</label>
        <input
          className={inputBase}
          placeholder="e.g. Gold bangles, Honda City, BKC flat"
          value={form.assetName ?? ''}
          onChange={e => set('assetName', e.target.value)}
        />
      </div>

      {/* Current value */}
      <div>
        <label className={labelClass}>Current value (₹) *</label>
        <input
          className={inputBase}
          type="number"
          min="1"
          placeholder="Enter current market value"
          value={form.currentValueRupees ?? ''}
          onChange={e => set('currentValueRupees', e.target.value)}
        />
        <p className="text-[11px] text-zinc-400/80 dark:text-zinc-500 mt-1.5 leading-relaxed font-medium">
          {catConfig.valuationHelpText}
        </p>
      </div>

      {/* Purchase value + date */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className={labelClass}>Purchase price (₹)</label>
          <input
            className={inputBase}
            type="number"
            min="0"
            placeholder="What you paid"
            value={form.purchaseValueRupees ?? ''}
            onChange={e => set('purchaseValueRupees', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Purchase date</label>
          <input
            className={inputBase}
            type="date"
            value={form.purchaseDate ?? ''}
            onChange={e => set('purchaseDate', e.target.value)}
          />
        </div>
      </div>

      {/* Dynamic extra fields per category */}
      {catConfig.extraFields?.map((field: any) => (
        <div key={field.key}>
          <label className={labelClass}>
            {field.label}{field.required ? ' *' : ''}
            {field.unit ? ` (${field.unit})` : ''}
          </label>

          {field.type === 'select' && (
            <select
              className={selectClass}
              value={extraFields[field.key] ?? ''}
              onChange={e => setExtra(field.key, e.target.value)}
            >
              <option value="">Select...</option>
              {field.options?.map((o: string) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}

          {field.type === 'boolean' && (
            <div className="flex gap-2.5">
              {['Yes', 'No'].map(opt => {
                const isSelected = opt === 'Yes' ? extraFields[field.key] === true : extraFields[field.key] === false
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExtra(field.key, opt === 'Yes')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-sm'
                        : 'bg-white border-zinc-200 text-zinc-500 dark:bg-white/[0.02] dark:border-white/10 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {field.type === 'textarea' && (
            <textarea
              className={inputBase + ' min-h-[80px] resize-y'}
              placeholder={field.placeholder}
              value={extraFields[field.key] ?? ''}
              onChange={e => setExtra(field.key, e.target.value)}
            />
          )}

          {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
            <input
              className={inputBase}
              type={field.type}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              value={extraFields[field.key] ?? ''}
              onChange={e => setExtra(
                field.key,
                field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value
              )}
            />
          )}

          {field.helpText && (
            <p className="text-[11px] text-zinc-400/80 dark:text-zinc-500 mt-1.5 leading-relaxed font-medium">{field.helpText}</p>
          )}
        </div>
      ))}

      {/* Valuation method */}
      <div>
        <label className={labelClass}>How was this value determined?</label>
        <select
          className={selectClass}
          value={form.valuationMethod ?? 'self_assessed'}
          onChange={e => set('valuationMethod', e.target.value)}
        >
          <option value="self_assessed">My own estimate</option>
          <option value="market_price">Current market price</option>
          <option value="purchase_cost">Purchase cost</option>
          <option value="professional">Professional / CA valuation</option>
          <option value="insured_value">Insurance declared value</option>
          <option value="book_value">Book value (depreciated)</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          className={inputBase + ' min-h-[60px] resize-y'}
          placeholder="Any other details you want to remember..."
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* Include in net worth toggle */}
      <div className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-white/[0.02] rounded-2xl border border-zinc-200/60 dark:border-white/10">
        <div>
          <div className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">Include in net worth</div>
          <div className="text-[11px] text-zinc-400/80 dark:text-zinc-500 font-medium">Toggle off for aspirational or uncertain assets</div>
        </div>
        <button
          type="button"
          onClick={() => set('includeInNetworth', !(form.includeInNetworth ?? true))}
          className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${
            (form.includeInNetworth ?? true) ? 'bg-zinc-900 dark:bg-lime-500' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        >
          <div className={`w-4.5 h-4.5 rounded-full bg-white absolute top-[3px] transition-all duration-200 shadow-sm ${
            (form.includeInNetworth ?? true) ? 'left-[19px]' : 'left-[3px]'
          }`} />
        </button>
      </div>

      {/* Errors */}
      {(validationError || error) && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3.5 text-xs font-medium text-red-700 dark:text-red-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {validationError || error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3.5 bg-zinc-900 dark:bg-lime-500 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-lime-400 rounded-xl font-semibold text-sm shadow-sm active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : 'Add to my assets →'}
      </button>

      <p className="text-[11px] text-zinc-400/80 dark:text-zinc-500 text-center font-medium">
        You can update the value anytime. We'll remind you every 90 days.
      </p>
    </div>
  )
}
