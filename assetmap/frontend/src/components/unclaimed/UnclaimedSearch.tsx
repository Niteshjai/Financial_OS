import React, { useState } from 'react';
import { UnclaimedResultCard } from './UnclaimedResultCard';
import { api } from '../../services/api';

export function UnclaimedSearch() {
  const [pan, setPan] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setSearchId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleInitiateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/unclaimed/search/initiate', { pan, name, paymentId: 'demo_payment_123' });
      setSearchId(res.data.searchId);
      // Wait for background worker to process it (mock timeout here)
      setTimeout(async () => {
        const resultRes = await api.get(`/unclaimed/search/${res.data.searchId}`);
        setResults(resultRes.data.results || []);
        setHasSearched(true);
        setLoading(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">
      <h2 className="text-xl font-semibold mb-2 text-zinc-900">Unclaimed Assets Search</h2>
      <p className="text-sm text-zinc-500 mb-6">Search across IEPF, EPFO, and IRDAI for forgotten money.</p>

      {!hasSearched && !loading && (
        <form onSubmit={handleInitiateSearch} className="flex flex-col gap-4 max-w-sm">
          <input 
            type="text" 
            placeholder="PAN Number" 
            className="border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-black"
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            required 
          />
          <input 
            type="text" 
            placeholder="Full Name as on PAN" 
            className="border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required 
          />
          <button type="submit" className="bg-black text-white px-4 py-2 rounded-xl font-medium hover:bg-zinc-800">
            Pay ₹99 & Search
          </button>
        </form>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="size-8 border-2 border-zinc-200 border-t-black rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-500 animate-pulse">Scanning government databases...</p>
        </div>
      )}

      {hasSearched && !loading && (
        <div className="flex flex-col gap-4 mt-6">
          <div className="text-sm font-medium text-zinc-700 bg-zinc-50 p-4 rounded-xl">
            Found {results.length} records matching your PAN across 3 databases.
          </div>
          <div className="flex flex-col gap-4">
            {results.map((r, i) => <UnclaimedResultCard key={i} result={r} />)}
            {results.length === 0 && <p className="text-sm text-zinc-500 py-4">No unclaimed assets found for this PAN.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
