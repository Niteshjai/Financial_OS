import { useFamilyStore } from '../../store/familyStore';
import { formatCurrency } from '../../utils/formatters';
import { Wallet } from 'lucide-react';

export default function FamilyMemberCard({ member }: { member: any }) {
  const { netWorth } = useFamilyStore();
  
  // Find member's net worth data
  const memberData = netWorth?.members?.find(m => m.userId === member.userId);
  const totalRupees = memberData ? memberData.totalPaise / 100 : 0;
  
  const statusColors: Record<string, string> = {
    active: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40',
    invited: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40',
    paused: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    removed: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/40'
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1A1D27] border border-zinc-200/70 dark:border-[#2E3148] p-5 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
            style={{ backgroundColor: member.avatarColor || '#10b981' }}
          >
            {(member.displayName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {member.displayName}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{member.relationship}</p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border shrink-0 ${statusColors[member.status] || statusColors.active}`}>
          {member.status}
        </span>
      </div>
      
      <div className="pt-3 border-t border-zinc-100 dark:border-[#2E3148] flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Shared Assets</p>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {member.status === 'active' ? formatCurrency(totalRupees) : '—'}
          </p>
        </div>
        <div className="size-8 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 grid place-items-center">
          <Wallet className="size-4" />
        </div>
      </div>
    </div>
  );
}
