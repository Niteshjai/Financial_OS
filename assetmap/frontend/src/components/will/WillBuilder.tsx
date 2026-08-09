import React, { useState } from 'react';
import { api } from '../../services/api';
import { FileText, User, Users, CheckCircle2, Download, ChevronRight } from 'lucide-react';

export function WillBuilder() {
  const [formData, setFormData] = useState({
    testatorName: '',
    testatorDob: '',
    testatorAddress: '',
    testatorPan: '',
    testatorAadhaarHash: '',
    executorName: '',
    executorRelation: '',
    executorMobile: '',
    subscriptionPlan: 'premium',
    subscriptionId: 'sub_123'
  });
  const [willId, setWillId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/will/create', formData);
      setWillId(res.data.willId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      await api.post(`/will/${willId}/generate-pdf`, {});
      alert("PDF Generated Successfully!");
    } catch (error) {
      console.error(error);
    }
  };

  if (willId) {
    return (
      <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl rounded-[24px] p-8 border border-zinc-300 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Will Draft Created</h2>
            <p className="text-sm text-zinc-500">Your digital will has been saved securely</p>
          </div>
        </div>
        <div className="bg-white/60 rounded-2xl p-4 mb-6 border border-zinc-200/50">
          <p className="text-[13px] text-zinc-500 mb-1">Will Reference ID</p>
          <p className="font-mono text-sm text-zinc-900 bg-zinc-100 rounded-lg px-3 py-2 select-all">{willId}</p>
        </div>
        <button
          onClick={handleGeneratePdf}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3 rounded-2xl font-medium hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm"
        >
          <Download className="size-4" strokeWidth={2} />
          Generate PDF Document
        </button>
      </div>
    );
  }

  const inputClass = "w-full bg-white/70 border border-zinc-200/80 rounded-2xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all";
  const labelClass = "text-[13px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block";

  return (
    <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl rounded-[24px] p-8 border border-zinc-300 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-xl bg-zinc-900 flex items-center justify-center">
          <FileText className="size-5 text-lime-300" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Create Digital Will</h2>
          <p className="text-sm text-zinc-500">Secure your family's financial future</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Testator Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="size-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-zinc-700">Your Details</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                required type="text" placeholder="e.g. Rajesh Kumar"
                className={inputClass}
                value={formData.testatorName}
                onChange={e => setFormData({...formData, testatorName: e.target.value})}
              />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input
                required type="date"
                className={inputClass}
                value={formData.testatorDob}
                onChange={e => setFormData({...formData, testatorDob: e.target.value})}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Address</label>
              <input
                required type="text" placeholder="e.g. 42, MG Road, Bengaluru, Karnataka 560001"
                className={inputClass}
                value={formData.testatorAddress}
                onChange={e => setFormData({...formData, testatorAddress: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-300/60" />

        {/* Executor Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-zinc-700">Executor Details</span>
            <span className="text-[11px] text-zinc-400 ml-1">(Person who will execute the will)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                required type="text" placeholder="e.g. Priya Kumar"
                className={inputClass}
                value={formData.executorName}
                onChange={e => setFormData({...formData, executorName: e.target.value})}
              />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <input
                required type="text" placeholder="e.g. Spouse, Son, Daughter"
                className={inputClass}
                value={formData.executorRelation}
                onChange={e => setFormData({...formData, executorRelation: e.target.value})}
              />
            </div>
            <div>
              <label className={labelClass}>Mobile Number</label>
              <input
                required type="tel" placeholder="e.g. +91 98765 43210"
                className={inputClass}
                value={formData.executorMobile}
                onChange={e => setFormData({...formData, executorMobile: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3.5 rounded-2xl font-medium hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm mt-2"
        >
          Save Will Details
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>

        <p className="text-[11px] text-zinc-400 text-center -mt-2">
          Your data is encrypted with AES-256-GCM and never stored in plaintext.
        </p>
      </form>
    </div>
  );
}
