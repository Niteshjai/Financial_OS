import NetWorthChart from './NetWorthChart';

export default function NetWorthContainer({ data }: { data: any }) {
  if (!data) return <div className="bg-zinc-200/50 dark:bg-[#1A1D27] animate-pulse rounded-[24px] h-[480px]"></div>;

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
