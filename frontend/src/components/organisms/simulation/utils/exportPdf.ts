type StatRow = { label: string; value: string; color?: string };
type TxRow = {
  label: string; // date or time
  side: string;
  price: number;
  shares: number;
  value: number;
  sharesAfter: number;
  portfolioValue: number;
};

function captureChart(container: HTMLDivElement | null, label: string): string {
  if (!container) return '';
  const canvases = container.querySelectorAll('canvas');
  if (!canvases.length) return '';
  const first = canvases[0];
  const merged = document.createElement('canvas');
  merged.width = first.width;
  merged.height = first.height;
  const ctx = merged.getContext('2d')!;
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, merged.width, merged.height);
  canvases.forEach((c) => ctx.drawImage(c, 0, 0));
  return `<p style="margin:16px 0 4px;font-size:12px;color:#555;font-weight:600">${label}</p><img src="${merged.toDataURL('image/png')}" style="width:100%;border-radius:6px;" />`;
}

export function exportSimPdf(
  ticker: string,
  stats: StatRow[],
  transactions: TxRow[],
  charts: { ref: HTMLDivElement | null; label: string }[],
  timeLabel = 'Date',
) {
  const chartHtml = charts.map((c) => captureChart(c.ref, c.label)).join('');

  const statHtml = stats
    .map(
      (s) =>
        `<div class="stat"><div class="stat-label">${s.label}</div><div class="stat-value" style="${s.color ? `color:${s.color}` : ''}">${s.value}</div></div>`,
    )
    .join('');

  const rows = transactions
    .map(
      (t) => `
      <tr>
        <td>${t.label}</td>
        <td style="color:${t.side === 'buy' ? '#16a34a' : '#dc2626'}">${t.side.toUpperCase()}</td>
        <td>$${t.price.toFixed(2)}</td>
        <td>${t.shares.toFixed(4)}</td>
        <td>$${t.value.toFixed(2)}</td>
        <td>${t.sharesAfter.toFixed(4)}</td>
        <td>$${t.portfolioValue.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><title>Simulation — ${ticker}</title>
    <style>
      body { font-family: sans-serif; padding: 32px; color: #111; }
      h1 { margin-bottom: 4px; } p { margin: 2px 0; color: #555; }
      .stats { display: flex; flex-wrap: wrap; gap: 16px; margin: 24px 0; }
      .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 18px; min-width: 140px; }
      .stat-label { font-size: 11px; color: #888; margin-bottom: 4px; }
      .stat-value { font-weight: 700; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; color: #555; }
      td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <h1>Simulation: ${ticker}</h1>
    <p>Generated ${new Date().toLocaleString()}</p>
    <div class="stats">${statHtml}</div>
    ${chartHtml}
    <table>
      <thead><tr><th>${timeLabel}</th><th>Action</th><th>Price</th><th>Shares</th><th>Value</th><th>Shares after</th><th>Portfolio</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload = () => { window.print(); }</script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
