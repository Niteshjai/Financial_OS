import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileEstate } from '../services/assets';

export default function EstateFiling() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ caseId: string; message: string } | null>(null);

  const [formData, setFormData] = useState({
    deceasedName: '',
    deceasedAadhaar: '',
    relationship: '',
  });
  const [deathCert, setDeathCert] = useState<File | null>(null);
  const [heirDoc, setHeirDoc] = useState<File | null>(null);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('deceasedName', formData.deceasedName);
      fd.append('deceasedAadhaar', formData.deceasedAadhaar.replace(/\s/g, ''));
      fd.append('relationship', formData.relationship);
      if (deathCert) fd.append('deathCertificate', deathCert);
      if (heirDoc) fd.append('legalHeirDoc', heirDoc);

      const result = await fileEstate(fd);
      setSuccess(result);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit estate case');
    } finally {
      setLoading(false);
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

      <div className="max-w-2xl mx-auto px-6 mt-8">
        <div className="text-center mb-8 animate-[fade-in_0.4s_ease]">
          <h1 className="text-2xl font-bold gradient-text mb-2">Estate Discovery</h1>
          <p className="text-surface-100/50 text-sm">
            Discover assets linked to a deceased person's Aadhaar
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
        )}

        {/* Step 1: Deceased Information */}
        {step === 1 && (
          <div className="glass-card p-6 animate-[slide-up_0.4s_ease]">
            <h2 className="text-lg font-semibold text-surface-50 mb-4">Deceased Person's Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-surface-100/70 mb-1">Full Name</label>
                <input type="text" value={formData.deceasedName} onChange={(e) => updateField('deceasedName', e.target.value)}
                  className="input-field" placeholder="As per Aadhaar card" />
              </div>
              <div>
                <label className="block text-sm text-surface-100/70 mb-1">Aadhaar Number</label>
                <input type="text" value={formData.deceasedAadhaar} onChange={(e) => updateField('deceasedAadhaar', e.target.value)}
                  className="input-field font-mono tracking-wider" placeholder="XXXX XXXX XXXX" maxLength={14} />
              </div>
              <div>
                <label className="block text-sm text-surface-100/70 mb-1">Your Relationship</label>
                <select value={formData.relationship} onChange={(e) => updateField('relationship', e.target.value)}
                  className="input-field">
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="son">Son</option>
                  <option value="daughter">Daughter</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="legal_heir">Legal Heir (other)</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!formData.deceasedName || formData.deceasedAadhaar.replace(/\s/g, '').length < 12 || !formData.relationship}
              className="btn-primary w-full mt-6"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div className="glass-card p-6 animate-[slide-up_0.4s_ease]">
            <h2 className="text-lg font-semibold text-surface-50 mb-4">Upload Documents</h2>

            <div className="space-y-4">
              <FileUpload label="Death Certificate" subtitle="PDF or JPEG, max 10MB"
                file={deathCert} onSelect={setDeathCert} accept=".pdf,.jpg,.jpeg,.png" />

              <FileUpload label="Legal Heir Certificate" subtitle="PDF or JPEG, max 10MB"
                file={heirDoc} onSelect={setHeirDoc} accept=".pdf,.jpg,.jpeg,.png" />
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
              <p className="text-xs text-amber-200/80">
                ⚠️ Documents will be encrypted with AES-256 and stored securely. They will be reviewed manually before assets are disclosed.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">← Back</button>
              <button onClick={handleSubmit} disabled={loading || !deathCert || !heirDoc} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Case'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && success && (
          <div className="glass-card p-8 text-center animate-[scale-in_0.5s_ease]">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-surface-50 mb-2">Case Filed Successfully</h2>
            <p className="text-surface-100/50 text-sm mb-2">{success.message}</p>
            <p className="text-xs text-surface-100/30">Case ID: {success.caseId}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileUpload({ label, subtitle, file, onSelect, accept }: {
  label: string; subtitle: string; file: File | null;
  onSelect: (file: File) => void; accept: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) onSelect(e.dataTransfer.files[0]);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
        dragOver ? 'border-primary-400 bg-primary-500/10' :
        file ? 'border-green-500/30 bg-green-500/5' : 'border-surface-700 hover:border-surface-500'
      }`}
    >
      <input type="file" accept={accept} onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
        className="absolute inset-0 opacity-0 cursor-pointer" />
      {file ? (
        <div className="flex items-center justify-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm text-green-300">{file.name}</span>
          <span className="text-xs text-surface-100/40">({(file.size / 1024).toFixed(0)} KB)</span>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-surface-100/70">{label}</p>
          <p className="text-xs text-surface-100/40 mt-1">{subtitle}</p>
          <p className="text-xs text-primary-400 mt-2">Click or drag to upload</p>
        </>
      )}
    </div>
  );
}
