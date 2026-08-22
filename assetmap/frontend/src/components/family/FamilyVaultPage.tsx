import { useEffect, useState } from 'react';
import { useFamilyStore } from '../../store/familyStore';
import { Loader2, Users, ShieldCheck, LineChart, Lock, Sparkles, ArrowRight } from 'lucide-react';
import FamilyNetWorth from './FamilyNetWorth';
import FamilyMemberCard from './FamilyMemberCard';
import InviteMember from './InviteMember';
import FamilyGoals from './FamilyGoals';
import FamilyEstateScore from './FamilyEstateScore';
import { toast } from 'sonner';

export default function FamilyVaultPage() {
  const { vault, isLoading, fetchVault, fetchNetWorth, fetchEstate, fetchGoals, createVault } = useFamilyStore();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  useEffect(() => {
    if (vault) {
      fetchNetWorth();
      fetchEstate();
      fetchGoals();
    }
  }, [vault, fetchNetWorth, fetchEstate, fetchGoals]);

  const handleCreateVault = async () => {
    setIsCreating(true);
    try {
      await createVault('My Family');
      toast.success('Family Vault created successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create Family Vault');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-zinc-400 dark:text-zinc-600" />
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="w-full relative overflow-hidden rounded-3xl bg-white/80 dark:bg-[#1A1D27]/80 backdrop-blur-xl border border-zinc-200/80 dark:border-[#2E3148] p-6 sm:p-10 md:p-12 shadow-sm text-center">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-72 bg-gradient-to-br from-lime-400/20 to-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/40 bg-lime-500/10 px-3.5 py-1.5 text-xs font-semibold text-lime-700 dark:text-lime-400 mb-5">
            <Sparkles className="size-3.5 text-lime-600 dark:text-lime-400" />
            Family Wealth & Estate Shield
          </div>

          {/* Icon */}
          <div className="size-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 grid place-items-center mx-auto mb-6 shadow-md shadow-zinc-900/10">
            <Users className="size-8 text-lime-300 dark:text-zinc-900" />
          </div>

          {/* Title & Description Container with solid responsive block width */}
          <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3 text-center">
              Welcome to Family Vault
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">
              A secure, collaborative space for your family to aggregate net worth, track common financial goals, and protect your loved ones&apos; future while keeping complete individual privacy.
            </p>
          </div>

          {/* 3 Value Pillars */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
            <div className="rounded-2xl bg-zinc-50/90 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 p-5">
              <div className="size-9 rounded-xl bg-lime-100 dark:bg-lime-950/60 text-lime-700 dark:text-lime-400 grid place-items-center mb-3">
                <LineChart className="size-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Combined Net Worth</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Real-time consolidated family balance across bank accounts, mutual funds & property.</p>
            </div>

            <div className="rounded-2xl bg-zinc-50/90 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 p-5">
              <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 grid place-items-center mb-3">
                <ShieldCheck className="size-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Estate Readiness</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Track nominee status and legal wills across every member to prevent asset loss.</p>
            </div>

            <div className="rounded-2xl bg-zinc-50/90 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 p-5">
              <div className="size-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 grid place-items-center mb-3">
                <Lock className="size-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Privacy Controls</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Each family member maintains full consent on what specific assets or totals they share.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2 flex justify-center">
            <button 
              onClick={handleCreateVault}
              disabled={isCreating}
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-3.5 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-zinc-900/20 dark:shadow-none disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating Vault...</span>
                </>
              ) : (
                <>
                  <span>Create Family Vault</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-200/60 dark:border-[#2E3148]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <Users className="size-7 text-lime-500 shrink-0" />
            {vault.vault_name}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Consolidated family assets, shared savings goals & estate protection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
            {vault.members?.filter((m: any) => m.status !== 'removed').length || 1} / {vault.max_members || 5} Members
          </span>
          <InviteMember vault={vault} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 space-y-6">
          <FamilyNetWorth />
          
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Family Members</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vault.members?.map((member: any) => (
                <FamilyMemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
          
          <FamilyGoals />
        </div>
        
        <div className="space-y-6">
          <FamilyEstateScore />
        </div>
      </div>
    </div>
  );
}
