import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface Props {
  onAdd: (beneficiary: { name: string; relationship: string; aadhaarNumber: string }) => void;
}

export default function WillBeneficiaryForm({ onAdd }: Props) {
  const [form, setForm] = useState({
    name: '',
    relationship: '',
    aadhaarNumber: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || form.name.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (!form.relationship) {
      setError('Relationship is required.');
      return;
    }
    const cleanAadhaar = form.aadhaarNumber.replace(/\s/g, '');
    if (!cleanAadhaar || cleanAadhaar.length < 12 || cleanAadhaar.length > 14) {
      setError('Aadhaar must be 12 digits.');
      return;
    }

    onAdd({ name: form.name, relation: form.relationship, aadhaarHash: cleanAadhaar });
    setForm({ name: '', relationship: '', aadhaarNumber: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <div className="space-y-2">
          <Label className="text-zinc-700 dark:text-zinc-300">Full Name *</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beneficiary's full legal name" className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-700 dark:text-zinc-300">Relationship *</Label>
          <select
            required
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            className="w-full p-2 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-white h-10 text-sm"
          >
            <option value="">Select relationship</option>
            <option value="Spouse">Spouse</option>
            <option value="Son">Son</option>
            <option value="Daughter">Daughter</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Brother">Brother</option>
            <option value="Sister">Sister</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-zinc-700 dark:text-zinc-300">Aadhaar Number *</Label>
          <Input required value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} placeholder="XXXX XXXX XXXX" maxLength={14} className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <Plus className="w-4 h-4 mr-2" /> Add Beneficiary
      </Button>
    </form>
  );
}
