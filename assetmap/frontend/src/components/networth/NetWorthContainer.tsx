import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import NetWorthChart from './NetWorthChart';

export default function NetWorthContainer() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/engagement/networth/history?period=12m')
      .then(res => setData((res.data as any).data))
      .catch(console.error);
  }, []);

  if (!data) return <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">Loading Net Worth...</div>;

  return (
    <NetWorthChart
      data={data.monthly || []}
      change1m={data.change1m || 0}
      change6m={data.change6m || 0}
      change1y={data.change1y || 0}
      allTimeHigh={data.allTimeHigh || 0}
    />
  );
}
