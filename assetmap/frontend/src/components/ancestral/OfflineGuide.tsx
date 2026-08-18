import React from 'react'

interface Props {
  guide: any
  onBack: () => void
}

export function OfflineGuide({ guide, onBack }: Props) {
  if (!guide) return null

  const steps = typeof guide.steps === 'string' ? JSON.parse(guide.steps) : guide.steps

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}
      >
        ← Back to search
      </button>

      <div style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '12px', border: '0.5px solid var(--border)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Offline Search Guide
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
          Online records for this area are limited. You will need to visit the local revenue office to find this property.
        </p>

        <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Office Details
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div><strong>State:</strong> {guide.state}</div>
            {guide.district && <div><strong>District:</strong> {guide.district}</div>}
            <div><strong>Office:</strong> {guide.tahsildar_office}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps?.map((step: any, index: number) => (
            <div key={index} style={{ display: 'flex', gap: '16px' }}>
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '14px', 
                background: 'var(--primary)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                flexShrink: 0
              }}>
                {step.step}
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  {step.title}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>
                  {step.description}
                </p>
                {step.tip && (
                  <div style={{ fontSize: '12px', color: '#185FA5', background: '#E6F1FB', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    💡 Tip: {step.tip}
                  </div>
                )}
                {step.form && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    📝 Document: {step.form}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
