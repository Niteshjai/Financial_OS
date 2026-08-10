import { useMemo, useState, useEffect } from 'react';
import { Shield, Check, AlertTriangle, ChevronRight, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/planStore';
import { toast } from 'sonner';

interface ShieldProps {
  totalAssets: number;
  totalAccounts: number;
  nomineeCoveredCount: number;
  totalNomineeAccounts: number;
  hasWill: boolean;
  hasDormantAccounts: boolean;
  landRecordsCount: number;
  hasInsurance: boolean;
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  points: number;
  action?: string;
  tab?: string;
  featureKey?: string;
}

export default function FinancialShield({
  totalAccounts,
  nomineeCoveredCount,
  totalNomineeAccounts,
  hasWill,
  hasDormantAccounts,
  landRecordsCount,
  hasInsurance,
}: ShieldProps) {
  const navigate = useNavigate();
  const { hasFeature } = usePlanStore();

  const checklist = useMemo<ChecklistItem[]>(() => [
    {
      key: 'assets',
      label: 'Assets discovered & synced',
      done: totalAccounts > 0,
      points: 15,
    },
    {
      key: 'nominees',
      label: `Nominees added (${nomineeCoveredCount}/${totalNomineeAccounts})`,
      done: totalNomineeAccounts > 0 && nomineeCoveredCount >= totalNomineeAccounts,
      points: 25,
      action: 'Add nominees',
    },
    {
      key: 'will',
      label: 'Digital Will created',
      done: hasWill,
      points: 20,
      action: 'Create Will',
      tab: 'will',
      featureKey: 'will_builder',
    },
    {
      key: 'insurance',
      label: 'Insurance coverage verified',
      done: hasInsurance,
      points: 15,
      action: 'Check coverage',
    },
    {
      key: 'property',
      label: 'Property records linked',
      done: landRecordsCount > 0,
      points: 10,
      action: 'Link property',
      tab: 'land',
      featureKey: 'land_records',
    },
    {
      key: 'dormant',
      label: 'No dormant accounts',
      done: !hasDormantAccounts,
      points: 15,
      action: 'Review accounts',
    },
  ], [totalAccounts, nomineeCoveredCount, totalNomineeAccounts, hasWill, hasInsurance, landRecordsCount, hasDormantAccounts]);

  const score = useMemo(() => {
    return checklist.reduce((sum, item) => sum + (item.done ? item.points : 0), 0);
  }, [checklist]);

  const completedCount = checklist.filter(i => i.done).length;
  const totalCount = checklist.length;

  // Animated score counter
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const getLevel = (s: number) => {
    if (s >= 90) return { label: 'Fortress', color: 'text-black', bg: 'bg-lime-300', ring: '#bef264' };
    if (s >= 70) return { label: 'Strong', color: 'text-zinc-800', bg: 'bg-lime-200', ring: '#d9f99d' };
    if (s >= 40) return { label: 'Growing', color: 'text-zinc-700', bg: 'bg-zinc-200', ring: '#52525b' };
    return { label: 'Vulnerable', color: 'text-zinc-500', bg: 'bg-zinc-100', ring: '#a1a1aa' };
  };

  const level = getLevel(score);

  // Simulated percentile (based on score — in production this would come from the backend)
  const percentile = Math.min(99, Math.round(40 + score * 0.55));

  // SVG circle params
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="bg-white/70 dark:bg-[#1A1D27]/80 backdrop-blur-xl rounded-[20px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-[#2E3148] flex flex-col h-full min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-zinc-900 dark:bg-white/10 flex items-center justify-center border border-black/5 dark:border-transparent">
            <Shield className="size-4 text-lime-300" strokeWidth={2} />
          </div>
          <span className="text-[13px] font-semibold text-black/60 dark:text-zinc-400 uppercase tracking-wide">
            Protection Shield
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-black/40 dark:text-zinc-500 text-[11px] font-medium">
          <Users className="size-3" />
          <span>Top <strong className="text-black/70 dark:text-zinc-300">{percentile}%</strong></span>
        </div>
      </div>

      {/* Score Ring + Level */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
            {/* Background ring */}
            <circle cx="48" cy="48" r={radius} fill="none" className="stroke-zinc-100 dark:stroke-white/5" strokeWidth="6" />
            {/* Progress ring */}
            <circle
              cx="48" cy="48" r={radius} fill="none"
              stroke={level.ring}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-black/90 dark:text-zinc-100">{displayScore}</span>
            <span className="text-[9px] text-black/40 dark:text-zinc-500 font-bold uppercase tracking-widest mt-0.5">/ 100</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md ${level.bg} dark:bg-white/10`}>
              <Sparkles className={`size-4 ${level.color} dark:text-white`} />
            </div>
            <span className={`text-lg font-bold ${level.color} dark:text-zinc-100`}>{level.label}</span>
          </div>
          <p className="text-[13px] text-black/60 dark:text-zinc-400 leading-relaxed font-medium">
            {score >= 90
              ? "Your family's finances are fully secured."
              : score >= 70
                ? "Almost there! A few steps to full protection."
                : score >= 40
                  ? "Good start. Complete more steps to secure your family."
                  : "Your family's financial future needs attention."}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                  background: level.ring,
                }}
              />
            </div>
            <span className="text-[11px] text-black/40 dark:text-zinc-500 font-semibold tabular-nums shrink-0">{completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-1.5 flex-1 mt-1">
        {checklist.map(item => (
          <div
            key={item.key}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 border border-transparent ${
              item.done
                ? 'bg-black/[0.02] dark:bg-white/5'
                : 'bg-white dark:bg-[#21253A] shadow-[0_2px_10px_rgb(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] hover:border-black/5 dark:hover:border-white/10 cursor-pointer'
            }`}
            onClick={() => {
              if (!item.done && item.tab) {
                if (item.featureKey && !hasFeature(item.featureKey)) {
                  toast.error('Premium Feature', {
                    description: 'This feature is only available for premium subscribers.',
                    action: {
                      label: 'Upgrade',
                      onClick: () => navigate('/pricing')
                    }
                  });
                } else {
                  navigate(`/dashboard?tab=${item.tab}`);
                }
              }
            }}
          >
            <div className={`size-5 rounded-full flex items-center justify-center shrink-0 ${
              item.done
                ? 'bg-zinc-900 dark:bg-lime-400/20 text-lime-300 dark:text-lime-400'
                : 'bg-zinc-100 dark:bg-white/10 text-zinc-400 dark:text-zinc-500'
            }`}>
              {item.done
                ? <Check className="size-3" strokeWidth={3} />
                : <AlertTriangle className="size-3" strokeWidth={2.5} />
              }
            </div>
            <span className={`text-[13px] flex-1 min-w-0 truncate font-medium ${
              item.done ? 'text-black/30 dark:text-zinc-600 line-through' : 'text-black/70 dark:text-zinc-200'
            }`}>
              {item.label}
            </span>
            {!item.done && (
              <span className="flex items-center gap-0.5 text-[12px] text-zinc-900 font-bold shrink-0 bg-lime-300/80 px-2 py-0.5 rounded-md">
                +{item.points}
                <ChevronRight className="size-3.5" strokeWidth={3} />
              </span>
            )}
            {item.done && (
              <span className="text-[12px] text-black/20 dark:text-zinc-700 font-bold shrink-0">+{item.points}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
