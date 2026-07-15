
export function UnclaimedResultCard({ result }: { result: any }) {
  return (
    <div className="border border-zinc-200 rounded-2xl p-5 hover:border-black transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-zinc-900">{result.company_name}</h3>
        <span className="font-bold text-lg">₹{(result.amount_paise / 100).toLocaleString('en-IN')}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-1 rounded-md font-medium">{result.source.toUpperCase()}</span>
        <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-1 rounded-md">{result.asset_type}</span>
      </div>
      
      <div className="text-sm text-zinc-600 mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
        <span className="font-medium text-yellow-800">How to claim:</span> {result.claim_process}
      </div>

      <a href={result.claim_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2">
        Go to Claims Portal
      </a>
    </div>
  );
}
