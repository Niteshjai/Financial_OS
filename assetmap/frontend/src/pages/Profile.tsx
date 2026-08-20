// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useAssetStore } from '../store/assetStore';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAssetStore();
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20" style={{ contain: 'layout style', background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 py-2 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 bg-white/50 hover:bg-white/80 border border-zinc-300/50 shadow-sm px-3 py-1.5 rounded-full transition-all font-medium text-sm backdrop-blur-sm"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-12">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-light tracking-tight text-zinc-900">My Profile</h1>
          <p className="text-zinc-600 mt-2">Manage your personal information and identity verification.</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-[24px] p-8 shadow-sm border border-zinc-200/50 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-zinc-900 to-zinc-800" />
          
          <div className="relative pt-12 flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="size-24 rounded-full bg-white p-1.5 shadow-md">
              <div className="w-full h-full bg-lime-300 rounded-full grid place-items-center text-zinc-900 font-display text-3xl font-bold">
                {initials}
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-display font-semibold text-zinc-900">{user?.name || 'AssetMap User'}</h2>
              <p className="text-sm text-zinc-600 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <ShieldCheck className="size-4 text-emerald-600" /> KYC Verified
              </p>
            </div>


          </div>
        </div>

        {/* Details List */}
        <div className="bg-white/80 backdrop-blur-lg rounded-[24px] shadow-sm border border-zinc-200/50 overflow-hidden">
          <div className="p-6 border-b border-zinc-200/50">
            <h3 className="text-lg font-display font-semibold">Contact & Identity</h3>
          </div>
          
          <div className="divide-y divide-zinc-200/50">
            <InfoRow icon={<Phone className="size-4" />} label="Phone Number" value={user?.mobile || '+91 98765 43210'} />
            <InfoRow icon={<Mail className="size-4" />} label="Email Address" value={user?.email || 'Not provided'} />
            <InfoRow icon={<User className="size-4" />} label="PAN Number" value={user?.pan || 'ABCDE1234F'} />
            <InfoRow icon={<ShieldCheck className="size-4" />} label="Aadhaar Status" value="Verified (Linked)" />
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50 transition">
      <div className="flex items-center gap-3 text-zinc-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm font-medium text-zinc-900">
        {value}
      </div>
    </div>
  );
}
