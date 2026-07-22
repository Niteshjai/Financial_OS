import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const BillingDashboard: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const [statusRes, historyRes] = await Promise.all([
          api.get('/plans/status'),
          api.get('/plans/billing-history')
        ]);
        setStatus(statusRes.data.data);
        setHistory(historyRes.data.data);
      } catch (err) {
        console.error('Failed to fetch billing info', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await api.post('/plans/cancel');
      alert('Subscription will be cancelled at the end of the billing period.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel subscription');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen text-zinc-900 font-sans" style={{ contain: 'layout style', background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>
      
      <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Current Plan</h2>
            <p className="text-gray-500 text-sm">
              You are currently on the <strong className="text-black capitalize">{status?.planName}</strong> plan.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
            status?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {status?.status}
          </span>
        </div>

        {status?.planId !== 'free' && status?.status === 'active' && (
          <div className="border-t pt-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 mb-1">Billing Cycle</p>
                <p className="font-medium capitalize">{status?.billingCycle}</p>
              </div>
              {status?.currentPeriodEnd && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Next Payment Due</p>
                  <p className="font-medium">{new Date(status.currentPeriodEnd).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex gap-4">
              <Link to="/pricing" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                Change Plan
              </Link>
              {!status?.cancelAtPeriodEnd && (
                <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel Subscription
                </button>
              )}
              {status?.cancelAtPeriodEnd && (
                <span className="px-4 py-2 text-sm font-medium text-red-600">
                  Cancels on {new Date(status.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {status?.planId === 'free' && (
          <div className="mt-6">
            <Link to="/pricing" className="inline-block px-6 py-3 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-600 transition-colors">
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">Payment History</h2>
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        {history.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{payment.total_paise / 100}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-gray-500 text-sm">No payment history found.</div>
        )}
      </div>
      </div>
    </div>
  );
};
