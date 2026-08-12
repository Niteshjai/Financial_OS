
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UnclaimedResultCard({ result }: { result: any }) {
  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
  };

  const docs = typeof result.documents_needed === 'string' 
    ? JSON.parse(result.documents_needed) 
    : (result.documents_needed || []);

  return (
    <Card className="bg-black/60 border-neutral-800 hover:border-emerald-900/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-400 border-emerald-900 bg-emerald-950/30">
                {result.source.toUpperCase()}
              </Badge>
              <span className="text-sm text-neutral-400">{result.asset_type}</span>
            </div>
            <h3 className="text-xl font-semibold text-white">{result.company_name}</h3>
            {result.folio_number_enc && (
              <p className="text-sm text-neutral-400">Ref / Folio: <span className="text-neutral-200">{result.folio_number_enc}</span></p>
            )}
            <div className="mt-4 text-sm text-neutral-300">
              <span className="font-medium">How to claim:</span> {result.claim_process}
            </div>
            
            {docs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">Documents Needed</p>
                <ul className="space-y-1">
                  {docs.map((doc: string, i: number) => (
                    <li key={i} className="text-sm text-neutral-400 flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-500" /> {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-between items-end gap-4 border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
            <div className="text-right w-full">
              <p className="text-sm text-neutral-400 mb-1">Estimated Value</p>
              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(result.amount_paise)}</p>
            </div>
            
            {result.claim_url && (
              <Button 
                variant="outline" 
                className="w-full border-emerald-600 text-emerald-500 hover:bg-emerald-950/50 flex items-center gap-2"
                onClick={() => window.open(result.claim_url, '_blank')}
              >
                Initiate Claim <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
