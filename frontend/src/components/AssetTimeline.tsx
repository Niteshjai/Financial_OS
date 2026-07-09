import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface Props {
  color: string;
  currentValue: number;
}

export default function AssetTimeline({ color, currentValue }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    // Generate simulated 12-month data
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const variance = (Math.random() - 0.3) * 0.15;
      const base = currentValue * (0.7 + (i / 12) * 0.3);
      return {
        date,
        value: Math.max(0, base * (1 + variance)),
      };
    });
    // Set last point to current value
    data[data.length - 1].value = currentValue;

    const g = svg
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)! * 1.1])
      .range([height, 0]);

    // Gradient fill
    const gradientId = `gradient-${color.replace('#', '')}`;
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '0').attr('y2', '1');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.3);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

    // Area
    const area = d3.area<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    // Line
    const line = d3.line<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    const linePath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', line)
      .style('filter', `drop-shadow(0 0 6px ${color}40)`);

    // Animate line drawing
    const totalLength = (linePath.node() as SVGPathElement)?.getTotalLength() || 0;
    linePath
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Data points
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.value))
      .attr('r', 3)
      .attr('fill', color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .delay((_, i) => i * 100)
      .duration(300)
      .attr('opacity', 1);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(6)
          .tickFormat((d) => d3.timeFormat('%b')(d as Date))
      )
      .call((g) => g.select('.domain').attr('stroke', 'rgba(148,163,184,0.2)'))
      .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(148,163,184,0.1)'))
      .call((g) => g.selectAll('.tick text').attr('fill', 'rgba(148,163,184,0.5)').attr('font-size', '10px'));

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(y)
          .ticks(4)
          .tickFormat((d) => {
            const val = d as number;
            if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
            return `₹${(val / 1000).toFixed(0)}K`;
          })
      )
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(148,163,184,0.1)').attr('x2', width))
      .call((g) => g.selectAll('.tick text').attr('fill', 'rgba(148,163,184,0.5)').attr('font-size', '10px'));

  }, [color, currentValue]);

  return <svg ref={svgRef} className="w-full" />;
}
