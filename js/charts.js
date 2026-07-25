/* ═══════════════════════════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════════════════════════ */
function buildDonut() {
  const svg    = document.getElementById('donut-svg');
  const legend = document.getElementById('donut-legend');
  const total  = DATA.length;
  const cx = 18, cy = 18, r = 14, stroke = 5;
  let offset = 0;
  svg.innerHTML = '';
  legend.innerHTML = '';
  DB_LIST.forEach(db => {
    const meta = DB_META[db] || { color:'#888' };
    const cnt  = dbCounts[db];
    const pct  = cnt / total;
    const dash = pct * 2 * Math.PI * r;
    const gap  = (1 - pct) * 2 * Math.PI * r;
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    c.setAttribute('fill','none'); c.setAttribute('stroke', meta.color);
    c.setAttribute('stroke-width', stroke);
    c.setAttribute('stroke-dasharray', `${dash} ${gap}`);
    c.setAttribute('stroke-dashoffset', -offset * 2 * Math.PI * r);
    c.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    svg.appendChild(c);
    offset += pct;

    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<div class="legend-dot" style="background:${meta.color}"></div>
      <div class="legend-label">${escapeHTML(db.split(' ').slice(1,3).join(' '))}</div>
      <div class="legend-val">${cnt}</div>`;
    li.addEventListener('click', () => goExploreDB(db));
    legend.appendChild(li);
  });
}

function buildDist() {
  const el     = document.getElementById('dist-bars');
  const sorted = [...DB_LIST].sort((a,b) => dbCounts[b] - dbCounts[a]);
  el.innerHTML = '';
  sorted.forEach(db => {
    const meta = DB_META[db] || { color:'#888' };
    const cnt  = dbCounts[db];
    const pct  = Math.round(cnt / maxCount * 100);
    const div  = document.createElement('div');
    div.className = 'dist-item';
    div.innerHTML = `
      <div class="dist-label">${escapeHTML(db)}</div>
      <div class="dist-bar-wrap"><div class="dist-bar" style="background:${meta.color};width:${pct}%"></div></div>
      <div class="dist-val">${cnt}</div>`;
    el.appendChild(div);
  });
}
