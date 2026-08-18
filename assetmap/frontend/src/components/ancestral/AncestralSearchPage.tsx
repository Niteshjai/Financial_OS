import { useState, useEffect } from 'react'
import { AncestralSearchForm }  from './AncestralSearchForm'
import { AncestralResultCard }  from './AncestralResultCard'
import { OfflineGuide }         from './OfflineGuide'

type Stage = 'form' | 'searching' | 'results' | 'no_results' | 'offline'

export default function AncestralSearchPage() {
  const [stage,     setStage]     = useState<Stage>('form')
  const [searchId,  setSearchId]  = useState<string|null>(null)
  const [searchData,setSearchData]= useState<any>(null)
  const [pollCount, setPollCount] = useState(0)

  const handleSearch = async (formData: any) => {
    setStage('searching')
    try {
      const res  = await fetch('/api/ancestral/search', {
        method:  'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body:    JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Network error or server restarting')
      const data = await res.json()
    if (!data.success) {
      if (data.error?.code === 'PLAN_GATE') {
        // Show upgrade prompt
        window.dispatchEvent(new CustomEvent('plan-gate', { detail: data.error }))
        setStage('form')
        return
      }
      throw new Error(data.error?.message)
    }
      setSearchId(data.data.searchId)
    } catch (err: any) {
      console.error(err)
      alert('Failed to start search. Please try again.')
      setStage('form')
    }
  }

  // Poll for results
  useEffect(() => {
    if (!searchId || stage !== 'searching') return

    const poll = async () => {
      try {
        const res  = await fetch(`/api/ancestral/search/${searchId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (!res.ok) return // Ignore transient errors (e.g. server restart)
        const data = await res.json()

      if (data.data?.isComplete) {
        setSearchData(data.data)
        if (data.data.search_method === 'offline_guide') {
          setStage('offline')
        } else if (data.data.hasResults) {
          setStage('results')
        } else {
          setStage('no_results')
        }
        return
        }
        setPollCount(c => c + 1)
      } catch (err) {
        // Ignore network errors during polling (common when backend auto-reloads in dev)
        console.warn('Polling error:', err)
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [searchId, stage])

  const handleConfirm = async (resultId: string, notes?: string) => {
    await fetch(`/api/ancestral/results/${resultId}/confirm`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}`},
      body: JSON.stringify({ notes })
    })
    // Refresh results
    if (searchId) {
      const res  = await fetch(`/api/ancestral/search/${searchId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      setSearchData(data.data)
    }
  }

  const handleReject = async (resultId: string) => {
    await fetch(`/api/ancestral/results/${resultId}/reject`, { 
      method:'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (searchId) {
      const res  = await fetch(`/api/ancestral/search/${searchId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      setSearchData(data.data)
    }
  }

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'20px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:500,
                    color:'var(--text-primary)', marginBottom:6 }}>
          Find lost ancestral property
        </h1>
        <p style={{ fontSize:13.5, color:'var(--text-secondary)',
                   lineHeight:1.6 }}>
          Search government land records by your ancestor's name.
          No documents needed — just tell us what you know.
        </p>
      </div>

      {/* Stage: Form */}
      {stage === 'form' && (
        <AncestralSearchForm onSubmit={handleSearch} />
      )}

      {/* Stage: Searching */}
      {stage === 'searching' && (
        <div style={{
          textAlign:'center', padding:'48px 20px',
          background:'var(--surface-2)',
          border:'0.5px solid var(--border)',
          borderRadius:12
        }}>
          <div style={{ fontSize:36, marginBottom:16 }}>🔍</div>
          <div style={{ fontWeight:500, fontSize:16,
                       color:'var(--text-primary)', marginBottom:8 }}>
            Searching land records...
          </div>
          <div style={{ fontSize:13, color:'var(--text-secondary)',
                       marginBottom:20, lineHeight:1.6 }}>
            We're checking state land portals and trying name variants.
            This takes 30–60 seconds.
          </div>
          <div style={{ display:'flex', flexDirection:'column',
                       gap:6, maxWidth:280, margin:'0 auto' }}>
            {[
              'Generating name spelling variants',
              'Searching district land records',
              'Running AI confidence scoring',
            ].map((step, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:8,
                fontSize:12.5, color:
                  pollCount > i * 3 ? 'var(--text-success)' : 'var(--text-muted)'
              }}>
                <span>{pollCount > i * 3 ? '✓' : '◌'}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage: Results */}
      {stage === 'results' && searchData && (
        <div>
          <div style={{
            display:'flex', justifyContent:'space-between',
            alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8
          }}>
            <div>
              <span style={{ fontWeight:500, fontSize:15,
                           color:'var(--text-primary)' }}>
                {searchData.results.length} possible match{searchData.results.length !== 1 ? 'es' : ''} found
              </span>
              <span style={{ fontSize:12.5, color:'var(--text-muted)',
                           marginLeft:10 }}>
                for "{searchData.ancestor_name}" in {searchData.state}
              </span>
            </div>
            <button
              onClick={() => setStage('form')}
              style={{
                padding:'7px 14px', borderRadius:8,
                border:'0.5px solid var(--border)',
                background:'transparent',
                color:'var(--text-secondary)',
                fontSize:12.5, cursor:'pointer'
              }}
            >Search again</button>
          </div>

          {searchData.results
            .sort((a: any, b: any) => b.confidence_score - a.confidence_score)
            .map((result: any) => (
              <AncestralResultCard
                key={result.id}
                result={result}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ))
          }

          <div style={{
            marginTop:16, padding:'12px 16px',
            background:'var(--surface-1)',
            borderRadius:8, fontSize:12.5,
            color:'var(--text-muted)', lineHeight:1.6
          }}>
            ℹ️ These results are leads from government revenue records,
            not legal proof of ownership. Confirm with the portal
            and consult a property lawyer before claiming.
          </div>
        </div>
      )}

      {/* Stage: No results */}
      {stage === 'no_results' && (
        <div style={{
          textAlign:'center', padding:'40px 20px',
          background:'var(--surface-2)',
          border:'0.5px solid var(--border)',
          borderRadius:12
        }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ fontWeight:500, fontSize:16,
                       color:'var(--text-primary)', marginBottom:8 }}>
            No matches found online
          </div>
          <div style={{ fontSize:13, color:'var(--text-secondary)',
                       marginBottom:20, lineHeight:1.6, maxWidth:400, margin:'0 auto 20px' }}>
            This could mean the village records aren't yet digitised,
            the name spelling in old records differs significantly,
            or the property is in a state with offline-only records.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button
              onClick={() => setStage('form')}
              style={{
                padding:'9px 18px', borderRadius:8,
                background:'#185FA5', color:'white',
                border:'none', fontWeight:500,
                fontSize:13, cursor:'pointer'
              }}
            >Try different name or village</button>
            <button
              onClick={async () => {
                if (searchId) {
                  const res  = await fetch(`/api/ancestral/search/${searchId}/offline-guide`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  })
                  const data = await res.json()
                  setSearchData({ ...searchData, offlineGuide: data.data })
                  setStage('offline')
                }
              }}
              style={{
                padding:'9px 18px', borderRadius:8,
                border:'0.5px solid var(--border)',
                background:'transparent',
                color:'var(--text-secondary)',
                fontSize:13, cursor:'pointer'
              }}
            >Get offline search guide</button>
          </div>
        </div>
      )}

      {/* Stage: Offline guide */}
      {stage === 'offline' && searchData && (
        <OfflineGuide
          guide={searchData.offlineGuide ?? searchData}
          onBack={() => setStage('form')}
        />
      )}
    </div>
  )
}
