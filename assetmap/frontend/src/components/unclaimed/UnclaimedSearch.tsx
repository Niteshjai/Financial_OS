import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import UnclaimedResultCard from './UnclaimedResultCard';

export default function UnclaimedSearch() {
  const [form, setForm] = useState({ pan: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);

  const handleInitiate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/unclaimed/search/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ ...form, paymentId: 'mock_pay_123' })
      });
      const data = await response.json();
      if (data.success) {
        setSearchId(data.data.searchId);
        startPolling(data.data.searchId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startPolling = (id: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/unclaimed/search/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          const req = data.data.request;
          if (req.search_status === 'completed' || req.search_status === 'failed') {
            setResults(data.data.results);
            setPolling(false);
            setLoading(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000); // poll every 5s
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white flex justify-center items-center gap-3">
          <Search className="h-10 w-10 text-emerald-500" />
          Unclaimed Assets Search
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We scan IEPF, EPFO, and IRDAI databases to find forgotten shares, mutual funds, EPF balances, and insurance policies linked to your PAN.
        </p>
      </div>

      {!searchId ? (
        <Card className="bg-black border-neutral-800 shadow-2xl max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Enter your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Permanent Account Number (PAN)</Label>
              <Input 
                value={form.pan} 
                onChange={(e) => setForm({...form, pan: e.target.value.toUpperCase()})}
                placeholder="ABCDE1234F"
                className="bg-neutral-900 border-neutral-800 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name (as per PAN)</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="John Doe"
                className="bg-neutral-900 border-neutral-800"
              />
            </div>
            
            <div className="pt-4 border-t border-neutral-800 mt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-neutral-400">Search Fee:</span>
                <span className="font-bold text-white">₹99</span>
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                onClick={handleInitiate} 
                disabled={loading || !form.pan || !form.name}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Pay & Search Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {polling ? (
            <div className="flex flex-col items-center justify-center p-12 bg-black border border-neutral-800 rounded-xl space-y-4">
              <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
              <h2 className="text-xl font-semibold">Scanning databases...</h2>
              <p className="text-neutral-400 text-sm text-center">Checking IEPF, EPFO, and Insurance registries.<br/>This usually takes 1-2 minutes.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 justify-center text-emerald-500">
                <CheckCircle2 className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Search Completed</h2>
              </div>
              <div className="text-center text-neutral-400">
                We found <span className="font-bold text-white">{results.length}</span> potential matches linked to your PAN.
              </div>

              {results.length > 0 && (
                <div className="space-y-4">
                  {results.map((res: any, idx: number) => (
                    <UnclaimedResultCard key={idx} result={res} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
