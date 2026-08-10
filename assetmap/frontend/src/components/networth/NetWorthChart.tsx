import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface MonthlyPoint {
  month: string
  total_paise: number
  bank_paise: number
  investments_paise: number
  land_paise: number
}

interface Props {
  data: MonthlyPoint[]
  change1m: number
  change6m: number
  change1y: number
  allTimeHigh: number
}

function formatINR(paise: number): string {
  const v = paise / 100
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}

export default function NetWorthChart({
  data, change1m, change6m, change1y, allTimeHigh
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [period, setPeriod] = useState<'6m' | '12m' | '24m'>('12m')

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 60 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = 240 - margin.top - margin.bottom

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const points = data.map(d => ({
      ...d,
      date: new Date(d.month)
    }))

    const x = d3.scaleTime()
      .domain(d3.extent(points, d => d.date) as [Date, Date])
      .range([0, width])

    const y = d3.scaleLinear()
      .domain([0, (d3.max(points, d => Number(d.total_paise)) || 0) * 1.1])
      .range([height, 0])

    // Area fill
    const area = d3.area<any>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(Number(d.total_paise)))
      .curve(d3.curveMonotoneX)

    // Gradient
    const defs = svg.append('defs')
    const grad = defs.append('linearGradient')
      .attr('id', 'nw-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', height + margin.top)

    grad.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.2)
    grad.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0)

    g.append('path')
      .datum(points)
      .attr('fill', 'url(#nw-gradient)')
      .attr('d', area)

    // Line
    const line = d3.line<any>()
      .x(d => x(d.date))
      .y(d => y(Number(d.total_paise)))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line)

    // Dots
    g.selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(Number(d.total_paise)))
      .attr('r', 3)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickFormat(d3.timeFormat('%b %y') as any)
      )
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', 'var(--color-muted-foreground)')
      .attr('transform', 'translate(-10, 5) rotate(-45)')
      .style('text-anchor', 'end')

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(y)
          .ticks(4)
          .tickFormat(d => formatINR(d as number))
      )
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', 'var(--color-muted-foreground)')

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(y)
          .ticks(4)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', 'var(--color-border)')
      .style('stroke-dasharray', '3,3')

    g.select('.grid .domain').remove()

  }, [data])

  const changeColor = (v: number) =>
    v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : '#71717a'
  const changePrefix = (v: number) => v > 0 ? '+' : ''
  const latestPaiseRaw = data.length ? data[data.length - 1]?.total_paise : 0
  const latestPaise = Number(latestPaiseRaw)
  const latestDisplayPaise = Number.isFinite(latestPaise) ? latestPaise : 0

  return (
    <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 dark:from-[#1A1D27] dark:via-[#21253A] dark:to-[#1A1D27] shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-none backdrop-blur-xl rounded-[24px] p-6 border border-zinc-300 dark:border-[#2E3148] h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Net worth over time</div>
          <div className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-100">
            {data.length ? formatINR(latestDisplayPaise) : '—'}
          </div>
        </div>
        <div className="flex gap-1.5">
          {(['6m', '12m', '24m'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-[20px] transition-all ${
                period === p 
                  ? 'border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100' 
                  : 'border border-transparent bg-transparent text-zinc-500 dark:text-zinc-400'
              }`}
            >{p}</button>
          ))}
        </div>
      </div>

      <svg ref={svgRef} width="100%" height="240"
        style={{ overflow: 'visible' }} />

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: '1 month', value: change1m },
          { label: '6 months', value: change6m },
          { label: '1 year', value: change1y },
        ].map(item => (
          <div key={item.label} className="bg-white/60 dark:bg-white/5 rounded-lg py-2 px-2.5 text-center border border-white/80 dark:border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
              {item.label}
            </div>
            <div className="text-[15px] font-semibold" style={{ color: changeColor(item.value) }}>
              {changePrefix(item.value)}{item.value}%
            </div>
          </div>
        ))}
      </div>

      {allTimeHigh > 0 && (
        <div className="mt-2.5 text-[12px] text-zinc-500 dark:text-zinc-400 text-center">
          All-time high: {formatINR(allTimeHigh)}
        </div>
      )}
    </div>
  )
}
