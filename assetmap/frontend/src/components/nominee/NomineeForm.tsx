import { useState } from 'react';
import { User, Calendar, Heart, Phone, Mail, MapPin, Shield, Users, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { NomineeInput } from '../../services/nominee';

const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'grandson', label: 'Grandson' },
  { value: 'granddaughter', label: 'Granddaughter' },
  { value: 'other', label: 'Other' },
];

interface NomineeFormProps {
  onSubmit: (nominees: NomineeInput[]) => void;
  loading:  boolean;
}

const emptyNominee = (): NomineeInput => ({
  nomineeName:   '',
  nomineeDob:    '',
  relationship:  'spouse',
  nomineeMobile: '',
  nomineeEmail:  '',
  nomineeAddress:'',
  nomineeAadhaar:'',
  isMinor:       false,
  guardianName:  '',
  guardianRelation: '',
  guardianMobile: '',
  allocationPct: 100,
  priorityOrder: 1,
});

export default function NomineeForm({ onSubmit, loading }: NomineeFormProps) {
  const [nominees, setNominees] = useState<NomineeInput[]>([emptyNominee()]);
  const [errors, setErrors]    = useState<string[]>([]);

  const update = (index: number, field: keyof NomineeInput, value: any) => {
    setNominees(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setErrors([]);
  };

  const addNominee = () => {
    if (nominees.length >= 4) return;
    const pctEach = Math.floor(100 / (nominees.length + 1));
    setNominees(prev => [
      ...prev.map((n, i) => ({ ...n, allocationPct: pctEach, priorityOrder: i + 1 })),
      { ...emptyNominee(), allocationPct: 100 - pctEach * nominees.length, priorityOrder: nominees.length + 1 },
    ]);
  };

  const removeNominee = (index: number) => {
    if (nominees.length <= 1) return;
    setNominees(prev => {
      const copy = prev.filter((_, i) => i !== index);
      if (copy.length === 1) copy[0].allocationPct = 100;
      return copy.map((n, i) => ({ ...n, priorityOrder: i + 1 }));
    });
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    for (let i = 0; i < nominees.length; i++) {
      const n = nominees[i];
      if (!n.nomineeName || n.nomineeName.trim().length < 2) errs.push(`Nominee ${i + 1}: Name is required (min 2 chars)`);
      if (!n.nomineeDob) errs.push(`Nominee ${i + 1}: Date of birth is required`);
      if (n.isMinor && !n.guardianName) errs.push(`Nominee ${i + 1}: Guardian name is required for minors`);
    }
    if (nominees.length > 1) {
      const total = nominees.reduce((s, n) => s + n.allocationPct, 0);
      if (total !== 100) errs.push(`Allocation must total 100%. Currently: ${total}%`);
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(nominees);
  };

  // Check if DOB indicates minor (< 18 years)
  const checkMinor = (dob: string): boolean => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today     = new Date();
    const age       = today.getFullYear() - birthDate.getFullYear();
    return age < 18;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {nominees.map((nom, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm relative">
          {/* Nominee header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-zinc-900 text-white grid place-items-center text-sm font-bold">
                {idx + 1}
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                {nominees.length > 1 ? `Nominee ${idx + 1}` : 'Nominee Details'}
              </h3>
            </div>
            {nominees.length > 1 && (
              <button type="button" onClick={() => removeNominee(idx)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>

          {/* Row 1: Name + DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <User className="size-3.5" /> Full Name *
              </label>
              <input required type="text" value={nom.nomineeName}
                onChange={e => update(idx, 'nomineeName', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Calendar className="size-3.5" /> Date of Birth *
              </label>
              <input required type="date" value={nom.nomineeDob}
                onChange={e => {
                  update(idx, 'nomineeDob', e.target.value);
                  if (checkMinor(e.target.value)) update(idx, 'isMinor', true);
                  else update(idx, 'isMinor', false);
                }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all" />
            </div>
          </div>

          {/* Row 2: Relationship + Allocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Heart className="size-3.5" /> Relationship *
              </label>
              <div className="relative">
                <select value={nom.relationship}
                  onChange={e => update(idx, 'relationship', e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all bg-white appearance-none pr-10">
                  {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            {nominees.length > 1 && (
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Allocation (%)</label>
                <input required type="number" min={1} max={100}
                  value={nom.allocationPct}
                  onChange={e => update(idx, 'allocationPct', Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all" />
              </div>
            )}
          </div>

          {/* Row 3: Mobile + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Phone className="size-3.5" /> Mobile
              </label>
              <input type="tel" value={nom.nomineeMobile}
                onChange={e => update(idx, 'nomineeMobile', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Mail className="size-3.5" /> Email
              </label>
              <input type="email" value={nom.nomineeEmail}
                onChange={e => update(idx, 'nomineeEmail', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                placeholder="nominee@email.com" />
            </div>
          </div>

          {/* Row 4: Address */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
              <MapPin className="size-3.5" /> Address
            </label>
            <input type="text" value={nom.nomineeAddress}
              onChange={e => update(idx, 'nomineeAddress', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
              placeholder="Full address" />
          </div>

          {/* Row 5: Aadhaar (optional) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
              <Shield className="size-3.5" /> Aadhaar Number
              <span className="text-zinc-400 font-normal">(optional — stored as hash only)</span>
            </label>
            <input type="text" value={nom.nomineeAadhaar}
              onChange={e => update(idx, 'nomineeAadhaar', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
              placeholder="XXXX XXXX XXXX" maxLength={14} />
          </div>

          {/* Minor nominee — Guardian fields */}
          {nom.isMinor && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                <Users className="size-4" /> Guardian Details (Nominee is a minor)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-1 block">Guardian Name *</label>
                  <input required type="text" value={nom.guardianName}
                    onChange={e => update(idx, 'guardianName', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 transition-all"
                    placeholder="Guardian full name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-1 block">Guardian Relation</label>
                  <input type="text" value={nom.guardianRelation}
                    onChange={e => update(idx, 'guardianRelation', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 transition-all"
                    placeholder="e.g. Father" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add nominee button */}
      {nominees.length < 4 && (
        <button type="button" onClick={addNominee}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors text-sm font-medium">
          <Plus className="size-4" /> Add Another Nominee (max 4)
        </button>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-red-600 text-sm">{err}</p>
          ))}
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={loading}
        className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg">
        {loading ? (
          <>
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          'Continue — Review Accounts'
        )}
      </button>
    </form>
  );
}
