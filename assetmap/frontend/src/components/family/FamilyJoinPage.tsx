import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Users } from 'lucide-react';
import { api } from '../../services/api';

export default function FamilyJoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [primaryUserName, setPrimaryUserName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No invite token provided.');
      return;
    }

    api.post('/family/join', { token })
      .then((res: any) => {
        setStatus('success');
        setPrimaryUserName(res.data?.data?.primaryUserName || 'Family');
        setTimeout(() => {
          navigate('/dashboard?tab=family');
        }, 3000);
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMsg(err.response?.data?.error?.message || 'Failed to join family vault.');
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0E1015] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#1A1D27] rounded-3xl shadow-xl border border-zinc-200/80 dark:border-[#2E3148] p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center py-4">
            <div className="size-14 rounded-2xl bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-400 grid place-items-center mb-4">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Joining Family Vault...</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Please wait while we verify your invitation.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-4">
            <div className="size-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-4">
              <CheckCircle2 className="size-7" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Welcome to {primaryUserName}&apos;s Family Vault!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              You have successfully joined the family vault. Redirecting you to the dashboard...
            </p>
            <button 
              onClick={() => navigate('/dashboard?tab=family')}
              className="mt-6 inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-4">
            <div className="size-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 grid place-items-center mb-4">
              <AlertCircle className="size-7" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Invitation Invalid or Expired</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-6">{errorMsg}</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95"
            >
              <span>Return to Dashboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
