
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BadgePercent, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LenderCard({ lender }: { lender: any }) {
  return (
    <Card className="bg-black/60 border-neutral-800 hover:border-sky-900/50 transition-colors group">
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white">{lender.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs uppercase bg-neutral-900 border-neutral-800 text-neutral-400">
                {lender.lender_type}
              </Badge>
              {lender.processing_fee_pct === '0.00' && (
                <Badge variant="outline" className="text-xs bg-green-950/30 text-green-400 border-green-900/50">
                  Zero Processing Fee
                </Badge>
              )}
            </div>
          </div>
          {lender.logo_url && (
            <img src={lender.logo_url} alt={lender.name} className="h-8 w-auto rounded" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 py-2 border-y border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
              <BadgePercent className="h-3 w-3" /> Interest Rate
            </p>
            <p className="font-semibold text-white">Starts at {lender.min_rate_pct}%</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3" /> Max Tenure
            </p>
            <p className="font-semibold text-white">{lender.max_tenure_months / 12} Years</p>
          </div>
        </div>

        <Button className="w-full bg-sky-600/10 text-sky-400 hover:bg-sky-600 hover:text-white border border-sky-900/50 transition-all group-hover:border-sky-500">
          Apply Now <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
