import { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X, Loader2, Users } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { toast } from 'sonner';

export default function InviteMember({ vault, trigger }: { vault: any, trigger?: React.ReactNode }) {
  const { inviteMember } = useFamilyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    relationship: 'spouse'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await inviteMember(formData.mobile, formData.name, formData.relationship);
      toast.success('Invitation sent successfully!');
      setIsOpen(false);
      setFormData({ name: '', mobile: '', relationship: 'spouse' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFull = (vault?.members || []).filter((m: any) => m.status !== 'removed').length >= (vault?.max_members || 5);

  return (
    <>
      {trigger ? (
        <div onClick={(e) => {
          e.stopPropagation();
          if (!isFull) setIsOpen(true);
        }} className={isFull ? 'opacity-50 cursor-not-allowed w-full' : 'cursor-pointer w-full'}>
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          disabled={isFull}
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus className="size-3.5" />
          <span>Invite Member</span>
        </button>
      )}

      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D27] border border-zinc-200 dark:border-[#2E3148] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-[#2E3148]">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-400 grid place-items-center">
                  <Users className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Invite Family Member</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Add a family member to your shared vault</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="size-8 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-400 grid place-items-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 py-2.5 rounded-l-xl border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-r-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Relationship
                </label>
                <select
                  required
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all"
                >
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
