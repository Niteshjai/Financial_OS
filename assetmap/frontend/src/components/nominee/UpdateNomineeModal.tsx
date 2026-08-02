import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';

interface NomineeFormProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  isBulk?: boolean;
  allMissingAccounts?: any[];
  onSuccess: (updatedIds: string[]) => void;
}

export function UpdateNomineeModal({ isOpen, onClose, account, isBulk, allMissingAccounts, onSuccess }: NomineeFormProps) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [relationship, setRelationship] = useState('SPOUSE');
  const [allocation, setAllocation] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const accountsToUpdate = isBulk && allMissingAccounts ? allMissingAccounts : [account];
      const updatedIds: string[] = [];

      await Promise.all(accountsToUpdate.map(async (acc) => {
        let platform = 'BANK';
        if (acc.fi_type === 'MUTUAL_FUND') platform = 'MFCENTRAL';
        if (acc.fi_type === 'EQUITY' || acc.fi_type === 'BONDS') platform = 'KRA';

        await api.post('/v1/nominate', {
          platform,
          assetRef: acc.id || 'REF-12345',
          nominees: [{
            name,
            dob,
            relationship,
            allocationPercentage: Number(allocation)
          }]
        });
        updatedIds.push(acc.id);
      }));

      onSuccess(updatedIds);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit nomination update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl p-6 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-semibold text-zinc-900">
            {isBulk ? `Update Nominee for ${allMissingAccounts?.length} Assets` : 'Update Nominee'}
          </DialogTitle>
          <div className="text-sm text-zinc-500 mt-1">
            {isBulk ? 'Apply the same nominee to all your unsecured accounts instantly.' : `${account?.institution_name} • ${account?.fi_type?.replace('_', ' ')}`}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nominee Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 transition-colors"
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Date of Birth</label>
            <input
              required
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Relationship</label>
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 transition-colors bg-white"
              >
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="PARENT">Parent</option>
                <option value="SIBLING">Sibling</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Allocation (%)</label>
              <input
                required
                type="number"
                min="1"
                max="100"
                value={allocation}
                onChange={e => setAllocation(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 transition-colors"
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Submit Update
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
