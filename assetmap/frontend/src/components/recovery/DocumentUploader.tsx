// ═══════════════════════════════════════════════════════════════
// Document Uploader — Guided document upload with checklist
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { uploadRecoveryDocument } from '../../services/recovery'
import { CheckCircle2, Upload, Zap, FileText, AlertCircle } from 'lucide-react'

interface Document {
  id:          string
  doc_type:    string
  doc_label:   string
  is_required: boolean
  is_received: boolean
  is_verified: boolean
  auto_fetched:boolean
  notes?:      string
  file_name?:  string
}

interface DocumentUploaderProps {
  caseId:    string
  documents: Document[]
  onDocumentUploaded: () => void
}

export default function DocumentUploader({ caseId, documents, onDocumentUploaded }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const required = documents.filter(d => d.is_required)
  const optional = documents.filter(d => !d.is_required)
  const receivedCount = required.filter(d => d.is_received).length
  const totalRequired = required.length
  const pctDone = totalRequired > 0 ? Math.round((receivedCount / totalRequired) * 100) : 0

  const handleUpload = async (doc: Document) => {
    setUploading(doc.doc_type)
    setError('')

    try {
      // Simulate file selection (in production, use file input)
      const fileName = `${doc.doc_type}_${Date.now()}.pdf`
      await uploadRecoveryDocument(caseId, {
        docType:       doc.doc_type,
        fileName,
        fileSizeBytes: 1024000,
        mimeType:      'application/pdf',
      })
      onDocumentUploaded()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-zinc-800">Required Documents</h3>
        <span className="text-sm font-medium text-zinc-500">
          {receivedCount}/{totalRequired} uploaded
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pctDone}%` }}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2.5">
        {required.map(doc => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            isUploading={uploading === doc.doc_type}
            onUpload={() => handleUpload(doc)}
          />
        ))}
      </div>

      {/* Optional docs */}
      {optional.length > 0 && (
        <div className="mt-6">
          <h4 className="text-[13px] font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Optional Documents
          </h4>
          <div className="space-y-2.5">
            {optional.map(doc => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                isUploading={uploading === doc.doc_type}
                onUpload={() => handleUpload(doc)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentRow({ doc, isUploading, onUpload }: {
  doc:         Document
  isUploading: boolean
  onUpload:    () => void
}) {
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
      doc.is_received
        ? 'bg-emerald-50/50 border-emerald-200/50'
        : 'bg-white border-zinc-200/80 hover:border-zinc-300'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
          doc.is_received ? 'bg-emerald-100' : 'bg-zinc-100'
        }`}>
          {doc.is_received ? (
            <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={2.5} />
          ) : (
            <FileText className="size-4 text-zinc-500" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-[14px] font-medium truncate ${
            doc.is_received ? 'text-emerald-800' : 'text-zinc-800'
          }`}>
            {doc.doc_label}
            {doc.auto_fetched && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <Zap className="size-3" /> DigiLocker
              </span>
            )}
          </p>
          {doc.notes && (
            <p className="text-[12px] text-zinc-400 mt-0.5 truncate">{doc.notes}</p>
          )}
        </div>
      </div>

      {!doc.is_received && (
        <button
          onClick={onUpload}
          disabled={isUploading}
          className="shrink-0 ml-3 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 transition disabled:opacity-50"
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Upload className="size-3.5" /> Upload
            </>
          )}
        </button>
      )}
    </div>
  )
}
