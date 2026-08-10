import { useEffect } from 'react';
import { useFamilyStore } from '../../store/familyStore';
import { Loader2 } from 'lucide-react';
import FamilyNetWorth from './FamilyNetWorth';
import FamilyMemberCard from './FamilyMemberCard';
import InviteMember from './InviteMember';
import FamilyGoals from './FamilyGoals';
import FamilyEstateScore from './FamilyEstateScore';

export default function FamilyVaultPage() {
  const { vault, isLoading, fetchVault, fetchNetWorth, fetchEstate, fetchGoals } = useFamilyStore();

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

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-black/20 dark:text-white/20" />
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full p-4 mb-6">
          <svg className="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome to Family Vault</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
          A shared financial space for your family. Invite members, share net worth, track common goals, and secure your family's future together while maintaining individual privacy.
        </p>
        <button 
          onClick={() => useFamilyStore.getState().createVault('My Family')}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Create Family Vault
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">{vault.vault_name}</h2>
          <p className="text-black/60 dark:text-zinc-400 mt-1">Manage your shared family finances</p>
        </div>
        <div className="flex items-center gap-3">
          <InviteMember vault={vault} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FamilyNetWorth />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vault.members.map((member) => (
              <FamilyMemberCard key={member.id} member={member} />
            ))}
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
