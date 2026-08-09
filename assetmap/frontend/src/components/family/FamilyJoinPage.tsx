import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
        setPrimaryUserName(res.data.data.primaryUserName);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-black/5 p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="size-10 animate-spin text-black/20 mb-4" />
            <h2 className="text-xl font-bold">Joining Family Vault...</h2>
            <p className="text-gray-500 mt-2">Please wait while we verify your invitation.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="size-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Welcome to {primaryUserName}&apos;s Family Vault!</h2>
            <p className="text-gray-500 mt-2">You have successfully joined the family vault. Redirecting you to the dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="size-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invite Failed</h2>
            <p className="text-gray-500 mt-2 mb-6">{errorMsg}</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
