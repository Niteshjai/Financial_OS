import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const COLORS: Record<string, string> = {
  DEPOSIT: '#3b82f6',
  EQUITY: '#10b981',
  MUTUAL_FUND: '#8b5cf6',
  INSURANCE_POLICIES: '#f59e0b',
  NPS: '#14b8a6',
  GSTN: '#ef4444',
};

interface CategoryData {
  fiType: string;
  label: string;
  totalValue: number;
  count: number;
}

interface Props {
  data: CategoryData[];
  total: number;
}

export default function NetWorthDonut({ data, total }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSlice, setHoveredSlice] = useState<CategoryData | null>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.6;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<CategoryData>()
      .value((d) => d.totalValue)
      .sort(null)
      .padAngle(0.02);

    const arc = d3
      .arc<d3.PieArcDatum<CategoryData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 8)
      .cornerRadius(4);

    const arcHover = d3
      .arc<d3.PieArcDatum<CategoryData>>()
      .innerRadius(innerRadius - 4)
      .outerRadius(radius - 2)
      .cornerRadius(4);

    const arcs = g
      .selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Animate slices in
    arcs
      .append('path')
      .attr('fill', (d) => COLORS[d.data.fiType] || '#6366f1')
      .attr('opacity', 0.85)
      .attr('cursor', 'pointer')
      .attr('d', arc)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))')
      .on('mouseenter', function (_, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover as any)
          .attr('opacity', 1);
        setHoveredSlice(d.data);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any)
          .attr('opacity', 0.85);
        setHoveredSlice(null);
      })
      // Entrance animation
      .transition()
      .duration(800)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t)) || '';
        };
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', 'rgba(241,245,249,0.5)')
      .attr('font-size', '11px')
      .text('TOTAL');

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('fill', 'rgba(241,245,249,0.9)')
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .text(formatCurrency(total));

  }, [data, total]);

  function formatCurrency(amount: number): string {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef} className="w-full max-w-[280px]" />

      {/* Tooltip */}
      {hoveredSlice && (
        <div className="mt-2 p-3 rounded-lg bg-surface-800 border border-surface-700 text-center animate-[fade-in_0.15s_ease]">
          <p className="text-sm font-medium text-surface-50">{hoveredSlice.label}</p>
          <p className="text-lg font-bold" style={{ color: COLORS[hoveredSlice.fiType] }}>
            ₹{hoveredSlice.totalValue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-surface-100/50">
            {hoveredSlice.count} account{hoveredSlice.count > 1 ? 's' : ''} •{' '}
            {total > 0 ? ((hoveredSlice.totalValue / total) * 100).toFixed(1) : 0}%
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        {data.map((item) => (
          <div key={item.fiType} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: COLORS[item.fiType] || '#6366f1' }}
            />
            <span className="text-surface-100/60 truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
