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
      .style('fill', '#71717a')
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
      .style('fill', '#71717a')

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
      .style('stroke', '#f4f4f5')
      .style('stroke-dasharray', '3,3')

    g.select('.grid .domain').remove()

  }, [data])

  const changeColor = (v: number) =>
    v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : '#71717a'
  const changePrefix = (v: number) => v > 0 ? '+' : ''

  return (
    <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl rounded-[24px] p-6 border border-zinc-300 h-full flex flex-col">
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8
      }}>
        <div>
          <div style={{
            fontSize: 11, color: '#71717a',
            textTransform: 'uppercase', letterSpacing: '.06em',
            marginBottom: 4
          }}>Net worth over time</div>
          <div style={{
            fontSize: 22, fontWeight: 600,
            color: '#18181b'
          }}>
            {data.length ? formatINR(Number(data[data.length - 1]?.total_paise) ?? 0) : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['6m', '12m', '24m'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                fontSize: 11, fontWeight: 500, padding: '3px 10px',
                borderRadius: 20,
                border: period === p ? '1px solid #e4e4e7' : '1px solid transparent',
                background: period === p ? '#f4f4f5' : 'transparent',
                color: period === p ? '#18181b' : '#71717a',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      <svg ref={svgRef} width="100%" height="240"
        style={{ overflow: 'visible' }} />

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, marginTop: 12
      }}>
        {[
          { label: '1 month', value: change1m },
          { label: '6 months', value: change6m },
          { label: '1 year', value: change1y },
        ].map(item => (
          <div key={item.label} style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)', borderRadius: 8,
            padding: '8px 10px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)'
          }}>
            <div style={{
              fontSize: 10, color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '.05em', marginBottom: 3
            }}>
              {item.label}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 600,
              color: changeColor(item.value)
            }}>
              {changePrefix(item.value)}{item.value}%
            </div>
          </div>
        ))}
      </div>

      {allTimeHigh > 0 && (
        <div style={{
          marginTop: 10, fontSize: 12,
          color: '#71717a',
          textAlign: 'center'
        }}>
          All-time high: {formatINR(allTimeHigh)}
        </div>
      )}
    </div>
  )
}
