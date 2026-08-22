import { useFamilyStore } from '../../store/familyStore';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

export default function FamilyEstateScore() {
  const { estate } = useFamilyStore();

  if (!estate) return null;

  const score = estate.overallScore || 0;
  const isGood = score >= 70;
  const isMedium = score >= 40 && score < 70;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1A1D27] border border-zinc-200/70 dark:border-[#2E3148] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Shield className="size-4 text-lime-500" />
          Estate & Nominee Readiness
        </h3>
      </div>
      
      {/* Circular score gauge */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative size-32 flex items-center justify-center mb-3">
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-zinc-100 dark:text-zinc-800"
              strokeDasharray="100, 100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3.5"
              fill="none"
            />
            <path
              className={isGood ? "text-emerald-500" : isMedium ? "text-amber-500" : "text-rose-500"}
              strokeDasharray={`${score}, 100`}
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3.5"
              fill="none"
            />
          </svg>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{score}</span>
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Score</span>
          </div>
        </div>
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-center">
          {isGood ? 'Family assets are well protected' : isMedium ? 'Moderate estate gaps detected' : 'Action required: add nominees and wills'}
        </p>
      </div>

      {/* Member breakdown */}
      <div className="space-y-2.5">
        {(estate.members || []).map((member: any) => (
          <div 
            key={member.userId} 
            className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="size-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                style={{ backgroundColor: member.avatarColor || '#10b981' }}
              >
                {(member.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{member.name}</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {member.nomineePct}% accounts nominated
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <div className={`inline-flex items-center gap-1 text-[11px] font-semibold ${member.hasWill ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {member.hasWill ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
                {member.hasWill ? 'Will Ready' : 'No Will'}
              </div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{member.estateScore}/100</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
