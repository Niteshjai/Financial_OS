import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateReport } from '../services/assets';

export default function Report() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const blob = await generateReport();
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfUrl(url);
    } catch (err: any) {
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `AssetMap-Report-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
    }
  }

  return (
    <div className="min-h-screen pb-12">
      <nav className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 px-6 py-3">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-surface-100/70 hover:text-surface-100 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 mt-8">
        <div className="text-center mb-8 animate-[fade-in_0.4s_ease]">
          <h1 className="text-2xl font-bold gradient-text mb-2">Asset Report</h1>
          <p className="text-surface-100/50 text-sm">
            Generate a comprehensive PDF report of all your discovered assets
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
        )}

        {!pdfUrl ? (
          <div className="glass-card p-8 text-center animate-[scale-in_0.4s_ease]">
            <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-50 mb-2">Generate Asset Report</h2>
            <p className="text-surface-100/50 text-sm mb-6 max-w-md mx-auto">
              This report includes your net worth summary, asset breakdown by category,
              account details, and property records. It's watermarked and encrypted.
            </p>

            <div className="space-y-2 text-left max-w-sm mx-auto mb-6">
              {['Net worth summary', 'Asset breakdown by category', 'Individual account details', 'Land & property records', 'Consent status', 'Watermarked for security'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-surface-100/60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={loading} className="btn-primary px-8 flex items-center justify-center gap-2 mx-auto">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Generate Report
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-[fade-in_0.4s_ease]">
            <div className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-50">Report Ready</p>
                  <p className="text-xs text-surface-100/50">Generated {new Date().toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownload} className="btn-primary text-sm py-2 px-4">
                  ⬇ Download PDF
                </button>
                <button onClick={() => setPdfUrl(null)} className="btn-ghost text-sm py-2 px-4">
                  Regenerate
                </button>
              </div>
            </div>

            {/* PDF Preview */}
            <div className="glass-card overflow-hidden" style={{ height: '70vh' }}>
              <iframe src={pdfUrl} className="w-full h-full" title="Asset Report Preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
