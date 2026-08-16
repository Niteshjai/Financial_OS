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
    <div className="text-center py-10 text-zinc-400 text-sm">Loading form...</div>
  )

  const inputClass = "w-full px-3 py-2.5 border border-zinc-200/60 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-zinc-400 dark:focus:border-white/20 transition placeholder:text-zinc-400"
  const labelClass = "text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block"

  return (
    <div className="space-y-4">
      {/* Asset name */}
      <div>
        <label className={labelClass}>{catConfig.emoji} Asset name *</label>
        <input
          className={inputClass}
          placeholder="e.g. Gold bangles, Honda City, BKC flat"
          value={form.assetName ?? ''}
          onChange={e => set('assetName', e.target.value)}
        />
      </div>

      {/* Current value */}
      <div>
        <label className={labelClass}>Current value (₹) *</label>
        <input
          className={inputClass}
          type="number"
          min="1"
          placeholder="Enter current market value"
          value={form.currentValueRupees ?? ''}
          onChange={e => set('currentValueRupees', e.target.value)}
        />
        <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
          {catConfig.valuationHelpText}
        </p>
      </div>

      {/* Purchase value + date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Purchase price (₹)</label>
          <input
            className={inputClass}
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
            className={inputClass}
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
              className={inputClass}
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
            <div className="flex gap-4">
              {['Yes', 'No'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    name={field.key}
                    className="accent-zinc-900 dark:accent-lime-400"
                    checked={
                      opt === 'Yes'
                        ? extraFields[field.key] === true
                        : extraFields[field.key] === false
                    }
                    onChange={() => setExtra(field.key, opt === 'Yes')}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {field.type === 'textarea' && (
            <textarea
              className={inputClass + ' min-h-[80px] resize-y'}
              placeholder={field.placeholder}
              value={extraFields[field.key] ?? ''}
              onChange={e => setExtra(field.key, e.target.value)}
            />
          )}

          {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
            <input
              className={inputClass}
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
            <p className="text-[11px] text-zinc-400 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}

      {/* Valuation method */}
      <div>
        <label className={labelClass}>How was this value determined?</label>
        <select
          className={inputClass}
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
          className={inputClass + ' min-h-[60px] resize-y'}
          placeholder="Any other details you want to remember..."
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* Include in net worth toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200/50 dark:border-white/10">
        <div>
          <div className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">Include in net worth</div>
          <div className="text-[11px] text-zinc-400">Toggle off for aspirational or uncertain assets</div>
        </div>
        <button
          type="button"
          onClick={() => set('includeInNetworth', !(form.includeInNetworth ?? true))}
          className={`w-11 h-6 rounded-full relative transition-colors ${
            (form.includeInNetworth ?? true) ? 'bg-zinc-900 dark:bg-lime-500' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <div className={`w-4.5 h-4.5 rounded-full bg-white absolute top-[3px] transition-all shadow-sm ${
            (form.includeInNetworth ?? true) ? 'left-[22px]' : 'left-[3px]'
          }`} style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Errors */}
      {(validationError || error) && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          {validationError || error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Add to my assets →'}
      </button>

      <p className="text-[11px] text-zinc-400 text-center">
        You can update the value anytime. We'll remind you every 90 days.
      </p>
    </div>
  )
}
