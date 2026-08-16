const fs = require('fs');

const path = 'src/components/networth/NetWorthChart.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)`;

const replacement = `  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const renderChart = () => {
      const svg = d3.select(svgRef.current)`;

content = content.replace(target, replacement);

const targetEnd = `      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0)
        dots
          .attr('r', 3)
          .attr('fill', '#3b82f6')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
      })

  }, [data, period])`;

const replacementEnd = `      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0)
        dots
          .attr('r', 3)
          .attr('fill', '#3b82f6')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
      })
    }

    renderChart();

    const resizeObserver = new ResizeObserver(() => {
      renderChart();
    });

    if (svgRef.current.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, period])`;

content = content.replace(targetEnd, replacementEnd);

fs.writeFileSync(path, content, 'utf8');
console.log('Chart updated successfully');
