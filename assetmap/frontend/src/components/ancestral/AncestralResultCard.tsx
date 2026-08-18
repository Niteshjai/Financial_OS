import { useState } from 'react'

interface Props {
  result:     any
  onConfirm:  (id:string, notes?:string) => void
  onReject:   (id:string) => void
}

const CONFIDENCE_CONFIG: Record<string, {color:string; bg:string; label:string}> = {
  very_likely: { color:'#3B6D11', bg:'#EAF3DE', label:'Very likely match' },
  likely:      { color:'#185FA5', bg:'#E6F1FB', label:'Likely match' },
  possible:    { color:'#854F0B', bg:'#FAEEDA', label:'Possible match' },
  unlikely:    { color:'#5F5E5A', bg:'#F1EFE8', label:'Weak match' },
}

export function AncestralResultCard({ result, onConfirm, onReject }: Props) {
  const [expanded, setExpanded]   = useState(false)
  const [notes,    setNotes]      = useState('')
  const [confirming,setConfirming]= useState(false)

  const cfg = CONFIDENCE_CONFIG[result.confidence_label] ??
              CONFIDENCE_CONFIG.possible

  const isConfirmed = result.user_status === 'confirmed'
  const isRejected  = result.user_status === 'rejected'

  return (
    <div style={{
      background:   'var(--surface-2)',
      border:       `0.5px solid ${isConfirmed ? '#97C459' : 'var(--border)'}`,
      borderRadius: 12,
      marginBottom: 12,
      overflow:     'hidden',
      opacity:      isRejected ? 0.5 : 1
    }}>
      {/* Top bar */}
      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'center', padding:'12px 16px',
        borderBottom:'0.5px solid var(--border)',
        background: isConfirmed ? '#EAF3DE22' : 'transparent'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            fontSize:11, fontWeight:600, padding:'2px 8px',
            borderRadius:10, background:cfg.bg, color:cfg.color
          }}>
            {result.confidence_score}% · {cfg.label}
          </span>
          {result.match_type !== 'exact' && (
            <span style={{
              fontSize:11, padding:'2px 8px', borderRadius:10,
              background:'var(--surface-1)', color:'var(--text-muted)'
            }}>
              via "{result.matched_variant}"
            </span>
          )}
        </div>
        {isConfirmed && (
          <span style={{ fontSize:12, color:'#3B6D11', fontWeight:500 }}>
            ✓ Added to your records
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontWeight:500, fontSize:15,
                     color:'var(--text-primary)', marginBottom:6 }}>
          {result.raw_owner_name}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',
                     gap:10, marginBottom:12 }}>
          {[
            { label:'Survey no.',  value:result.survey_number || '—' },
            { label:'Village',     value:result.village || '—' },
            { label:'District',    value:result.district || '—' },
            { label:'Area',        value:result.land_area_acres ? `${result.land_area_acres} acres` : '—' },
            { label:'Land type',   value:result.land_type || '—' },
            { label:'Current owner',value:result.current_owner_name || 'Same / unknown' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:500,
                           color:'var(--text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {result.has_encumbrance && (
          <div style={{
            padding:'6px 10px', borderRadius:6, marginBottom:10,
            background:'#FAEEDA', color:'#854F0B', fontSize:12.5
          }}>
            ⚠️ Encumbrance recorded — this property may have a loan or dispute
          </div>
        )}

        {/* AI reasons */}
        {result.confidence_reasons?.length > 0 && (
          <div style={{ fontSize:12.5, color:'#3B6D11', marginBottom:8 }}>
            {result.confidence_reasons.map((r: string, i: number) => (
              <div key={i}>✓ {r}</div>
            ))}
          </div>
        )}

        {/* Expand for full detail */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background:'none', border:'none', cursor:'pointer',
            fontSize:12.5, color:'var(--text-accent)', padding:0,
            marginBottom: expanded ? 12 : 0
          }}
        >
          {expanded ? '▲ Show less' : '▼ Show full details + next steps'}
        </button>

        {expanded && (
          <div>
            <div style={{ fontSize:12.5, color:'var(--text-secondary)',
                         lineHeight:1.6, marginBottom:12 }}>
              <strong style={{ fontWeight:500 }}>Next steps to verify:</strong><br/>
              1. Open the {result.state} land portal (link below)<br/>
              2. Search by survey number: {result.survey_number}<br/>
              3. Download the official record (7/12 / RTC / Jamabandi)<br/>
              4. Consult a local property lawyer if ownership needs to be changed
            </div>

            {result.portal_url && (
              <a
                href={result.deep_link_url ?? result.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:'inline-block', marginBottom:12,
                  padding:'7px 14px', borderRadius:8,
                  border:'0.5px solid var(--border)',
                  fontSize:12.5, color:'var(--text-accent)',
                  textDecoration:'none'
                }}
              >
                Open {result.state} land portal ↗
              </a>
            )}

            {!isConfirmed && !isRejected && (
              <div>
                <textarea
                  style={{
                    width:'100%', padding:'8px 10px',
                    border:'0.5px solid var(--border)',
                    borderRadius:8, background:'var(--surface-1)',
                    color:'var(--text-primary)', fontSize:12.5,
                    minHeight:60, resize:'vertical', marginBottom:10
                  }}
                  placeholder="Optional: Add notes (e.g. 'matches grandfather's village name')"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={async () => {
                      setConfirming(true)
                      await onConfirm(result.id, notes)
                      setConfirming(false)
                    }}
                    disabled={confirming}
                    style={{
                      padding:'8px 16px', borderRadius:8,
                      background:'#1D9E75', color:'white',
                      border:'none', fontWeight:500,
                      fontSize:13, cursor:'pointer',
                      opacity: confirming ? 0.7 : 1
                    }}
                  >
                    {confirming ? 'Adding...' : '✓ This is ours — add to records'}
                  </button>
                  <button
                    onClick={() => onReject(result.id)}
                    style={{
                      padding:'8px 14px', borderRadius:8,
                      border:'0.5px solid var(--border)',
                      background:'transparent',
                      color:'var(--text-muted)',
                      fontSize:12.5, cursor:'pointer'
                    }}
                  >
                    Not ours
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
