import { useState, useEffect } from 'react'

interface Props {
  onSubmit: (data: any) => void
}

export function AncestralSearchForm({ onSubmit }: Props) {
  const [formData, setFormData] = useState({
    ancestorName: '',
    relationship: '',
    relationshipLabel: '',
    state: '',
    district: '',
    taluka: '',
    village: '',
    surveyNumber: '',
    approximateDecade: '',
    additionalClues: ''
  })
  const [states, setStates] = useState<{value:string, label:string, method:string}[]>([])

  useEffect(() => {
    fetch('/api/ancestral/states', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStates(data.data)
        }
      })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '12px', border: '0.5px solid var(--border)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ancestor's Name *</label>
          <input
            name="ancestorName"
            value={formData.ancestorName}
            onChange={handleChange}
            required
            placeholder="e.g. Ramesh Kumar Sharma"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Relationship *</label>
            <select
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              <option value="">Select...</option>
              <option value="grandfather">Grandfather</option>
              <option value="grandmother">Grandmother</option>
              <option value="great_grandfather">Great Grandfather</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="uncle">Uncle</option>
              <option value="other_ancestor">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>State *</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              <option value="">Select State...</option>
              {states.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>District</label>
            <input
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g. Pune"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Taluka / Tehsil</label>
            <input
              name="taluka"
              value={formData.taluka}
              onChange={handleChange}
              placeholder="e.g. Haveli"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Village</label>
            <input
              name="village"
              value={formData.village}
              onChange={handleChange}
              placeholder="e.g. Wagholi"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Additional Clues (Optional)</label>
          <textarea
            name="additionalClues"
            value={formData.additionalClues}
            onChange={handleChange}
            placeholder="Any other details like approximate decade (1980s), nearby landmarks, survey numbers, etc."
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Search Land Records
        </button>
      </form>
    </div>
  )
}
