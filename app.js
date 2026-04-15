
// =================== DATA STORE ===================
let sessions = JSON.parse(localStorage.getItem('apex_sessions') || '[]');
let selectedWeather = '☀️ Ensoleillé';
let selectedTyre = '';

function save() {
  localStorage.setItem('apex_sessions', JSON.stringify(sessions));
}

// =================== NAVIGATION ===================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const navLinks = document.querySelectorAll('nav a');
  const pages = ['dashboard','sessions','add','compare'];
  const idx = pages.indexOf(id);
  if (idx >= 0) navLinks[idx].classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'dashboard') renderDashboard();
  if (id === 'sessions') renderSessions();
  if (id === 'compare') renderCompare(true);
  if (id === 'add') setDefaultDate();
}

function setDefaultDate() {
  const d = new Date().toISOString().split('T')[0];
  document.getElementById('f-date').value = d;
}

// =================== WEATHER / TYRE SELECT ===================
function selectWeather(el) {
  document.querySelectorAll('.weather-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  selectedWeather = el.dataset.val;
}

function selectTyre(el, type) {
  document.querySelectorAll('.tyre-option').forEach(o => {
    o.className = 'tyre-option';
  });
  el.classList.add('active-' + type);
  selectedTyre = el.dataset.val;
}

// =================== SAVE SESSION ===================
function saveSession() {
  const circuit = document.getElementById('f-circuit').value.trim();
  const date = document.getElementById('f-date').value;
  const moto = document.getElementById('f-moto').value.trim();
  const bestTime = document.getElementById('f-best-time').value.trim();

  if (!circuit || !date || !moto || !bestTime) {
    showToast('⚠ Champs obligatoires manquants', 'red');
    return;
  }

  const lapTimesRaw = document.getElementById('f-lap-times').value;
  const lapTimes = lapTimesRaw
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const session = {
    id: Date.now(),
    circuit,
    date,
    type: document.getElementById('f-type').value,
    duration: document.getElementById('f-duration').value,
    laps: parseInt(document.getElementById('f-laps').value) || lapTimes.length || 0,
    moto,
    cc: document.getElementById('f-cc').value,
    prep: document.getElementById('f-prep').value,
    setup: document.getElementById('f-setup').value,
    weather: selectedWeather,
    tempAir: document.getElementById('f-temp-air').value,
    tempTrack: document.getElementById('f-temp-track').value,
    humidity: document.getElementById('f-humidity').value,
    wind: document.getElementById('f-wind').value,
    trackCond: document.getElementById('f-track-cond').value,
    tyreBrand: document.getElementById('f-tyre-brand').value,
    tyreCompound: selectedTyre,
    pressF: document.getElementById('f-press-f').value,
    pressR: document.getElementById('f-press-r').value,
    warmerF: document.getElementById('f-warmer-f').value,
    warmerR: document.getElementById('f-warmer-r').value,
    bestTime,
    avgTime: document.getElementById('f-avg-time').value,
    firstLap: document.getElementById('f-first-lap').value,
    lapTimes,
    feeling: document.getElementById('f-feeling').value,
    gripF: document.getElementById('f-grip-f').value,
    gripR: document.getElementById('f-grip-r').value,
    notes: document.getElementById('f-notes').value,
  };

  sessions.unshift(session);
  save();
  updateSessionCount();
  showToast('✓ Session enregistrée avec succès !');
  resetForm();
  showPage('dashboard');
}

function resetForm() {
  ['f-circuit','f-moto','f-cc','f-setup','f-tyre-brand','f-press-f','f-press-r',
   'f-best-time','f-avg-time','f-first-lap','f-lap-times','f-notes','f-duration','f-laps'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-temp-air','f-temp-track','f-humidity','f-wind','f-feeling','f-grip-f','f-grip-r'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dispatchEvent(new Event('input'));
  });
  selectedTyre = '';
  document.querySelectorAll('.tyre-option').forEach(o => o.className = 'tyre-option');
  document.querySelectorAll('.weather-option').forEach((o, i) => {
    o.classList.toggle('active', i === 0);
  });
  selectedWeather = '☀️ Ensoleillé';
  setDefaultDate();
}

// =================== PARSE TIME ===================
function parseTime(str) {
  if (!str) return Infinity;
  const m = str.match(/(\d+):(\d+)\.(\d+)/);
  if (!m) return Infinity;
  return parseInt(m[1])*60 + parseInt(m[2]) + parseInt(m[3])/1000;
}

function formatDiff(a, b) {
  const diff = parseTime(a) - parseTime(b);
  if (!isFinite(diff)) return '—';
  const sign = diff > 0 ? '+' : '';
  return sign + diff.toFixed(3) + 's';
}

// =================== DASHBOARD ===================
function renderDashboard() {
  updateSessionCount();
  if (!sessions.length) {
    document.getElementById('dashboard-recent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏁</div>
        <div class="empty-text">Aucune session enregistrée</div>
        <p style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:8px">Cliquez sur "+ Nouvelle Session" pour commencer</p>
      </div>`;
    document.getElementById('circuit-progress').innerHTML = '';
    document.getElementById('stat-best').textContent = '--:--.---';
    document.getElementById('stat-best-circuit').textContent = '—';
    document.getElementById('stat-sessions').textContent = '0';
    document.getElementById('stat-laps').textContent = '0';
    document.getElementById('stat-circuits').textContent = '0';
    return;
  }

  // Stats
  const allTimes = sessions.filter(s => s.bestTime).sort((a,b) => parseTime(a.bestTime) - parseTime(b.bestTime));
  const best = allTimes[0];
  document.getElementById('stat-best').textContent = best ? best.bestTime : '—';
  document.getElementById('stat-best-circuit').textContent = best ? best.circuit : '—';
  document.getElementById('stat-sessions').textContent = sessions.length;
  document.getElementById('stat-laps').textContent = sessions.reduce((a,s) => a + (s.laps||0), 0);
  const circuits = [...new Set(sessions.map(s => s.circuit))];
  document.getElementById('stat-circuits').textContent = circuits.length;

  // Recent sessions
  const recent = sessions.slice(0, 5);
  document.getElementById('dashboard-recent').innerHTML = buildSessionRows(recent);

  // Circuit progress
  const cpEl = document.getElementById('circuit-progress');
  cpEl.innerHTML = '';
  circuits.forEach(circuit => {
    const circ_sessions = sessions.filter(s => s.circuit === circuit)
      .sort((a,b) => new Date(a.date) - new Date(b.date));
    const times = circ_sessions.map(s => parseTime(s.bestTime)).filter(t => isFinite(t));
    if (!times.length) return;
    const best = Math.min(...times);
    const worst = Math.max(...times);
    const latest = circ_sessions[circ_sessions.length-1];
    const first = circ_sessions[0];
    const diff = parseTime(first.bestTime) - parseTime(latest.bestTime);

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--panel);border:1px solid var(--border);padding:1.2rem';
    card.innerHTML = `
      <div style="font-family:var(--head);font-weight:900;font-size:16px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:0.8rem">${circuit}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
        <span style="font-family:var(--mono);font-size:20px;color:var(--green)">${latest.bestTime || '—'}</span>
        <span style="font-family:var(--mono);font-size:11px;color:${diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)'}">
          ${diff > 0 ? '▼ -' + diff.toFixed(3) + 's' : diff < 0 ? '▲ +' + Math.abs(diff).toFixed(3) + 's' : '→ Stable'}
        </span>
      </div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:4px">${circ_sessions.length} session${circ_sessions.length>1?'s':''} · ${times.length} chrono${times.length>1?'s':''}</div>
    `;
    cpEl.appendChild(card);
  });
}

function buildSessionRows(data) {
  if (!data.length) return '<div class="empty-state"><div class="empty-icon">🏁</div><div class="empty-text">Aucune session</div></div>';

  let html = `<div class="sessions-grid">
    <div class="session-row header">
      <span class="col-label">Date</span>
      <span class="col-label">Circuit</span>
      <span class="col-label">Meilleur temps</span>
      <span class="col-label">Moto</span>
      <span class="col-label">Météo</span>
      <span class="col-label">Pneu</span>
      <span class="col-label">Tours</span>
      <span></span>
    </div>`;

  data.forEach(s => {
    const weatherEmoji = s.weather ? s.weather.split(' ')[0] : '—';
    const wClass = s.weather && s.weather.includes('Pluie') ? 'weather-rain' :
                   s.weather && s.weather.includes('Nuageux') ? 'weather-cloud' : 'weather-sun';
    const tClass = s.tyreCompound === 'S' ? 'tyre-s' : s.tyreCompound === 'M' ? 'tyre-m' :
                   s.tyreCompound === 'H' ? 'tyre-h' : 'tyre-m';
    html += `
      <div class="session-row" onclick="showDetail(${s.id})">
        <span class="session-date">${s.date || '—'}</span>
        <span class="session-circuit">${s.circuit}</span>
        <span class="session-time">${s.bestTime || '—'}</span>
        <span class="session-moto">${s.moto}</span>
        <span><span class="weather-badge ${wClass}">${weatherEmoji} ${s.tempAir || '—'}°</span></span>
        <span>${s.tyreBrand ? `<span class="tyre-badge ${tClass}">${s.tyreCompound || '?'}</span>` : '<span class="pill">N/A</span>'}</span>
        <span class="session-laps">${s.laps || '—'}</span>
        <span><button class="btn-sm">DÉTAIL ▶</button></span>
      </div>`;
  });
  html += '</div>';
  return html;
}

// =================== SESSIONS PAGE ===================
function renderSessions() {
  const circuitFilter = document.getElementById('filter-circuit').value;
  const motoFilter = document.getElementById('filter-moto').value;
  const sort = document.getElementById('filter-sort').value;

  // Populate filters
  const circuits = [...new Set(sessions.map(s => s.circuit))];
  const motos = [...new Set(sessions.map(s => s.moto))];
  const circSel = document.getElementById('filter-circuit');
  const curCirc = circSel.value;
  circSel.innerHTML = '<option value="">Tous les circuits</option>' +
    circuits.map(c => `<option value="${c}" ${c === curCirc ? 'selected' : ''}>${c}</option>`).join('');
  const motoSel = document.getElementById('filter-moto');
  const curMoto = motoSel.value;
  motoSel.innerHTML = '<option value="">Toutes les motos</option>' +
    motos.map(m => `<option value="${m}" ${m === curMoto ? 'selected' : ''}>${m}</option>`).join('');

  let filtered = [...sessions];
  if (circuitFilter) filtered = filtered.filter(s => s.circuit === circuitFilter);
  if (motoFilter) filtered = filtered.filter(s => s.moto === motoFilter);

  if (sort === 'date-asc') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
  else if (sort === 'date-desc') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  else if (sort === 'time-asc') filtered.sort((a,b) => parseTime(a.bestTime) - parseTime(b.bestTime));

  document.getElementById('sessions-list').innerHTML = buildSessionRows(filtered);
}

// =================== DETAIL ===================
function showDetail(id) {
  const s = sessions.find(x => x.id === id);
  if (!s) return;

  let lapChart = '';
  if (s.lapTimes && s.lapTimes.length > 0) {
    const times = s.lapTimes.map(t => parseTime(t)).filter(t => isFinite(t));
    const min = Math.min(...times);
    const max = Math.max(...times);
    const bars = times.map(t => {
      const pct = max > min ? ((t - min) / (max - min)) * 80 + 10 : 50;
      const isBest = t === min;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-family:var(--mono);font-size:10px;color:var(--muted);width:24px;text-align:right">${times.indexOf(t)+1}</span>
        <div style="flex:1;height:14px;background:var(--black);position:relative">
          <div style="height:100%;width:${pct}%;background:${isBest ? 'var(--green)' : 'var(--red)'};opacity:0.7;transition:width 0.3s"></div>
        </div>
        <span style="font-family:var(--mono);font-size:11px;color:${isBest ? 'var(--green)' : 'var(--text)'};">${s.lapTimes[times.indexOf(t)]}</span>
      </div>`;
    }).join('');
    lapChart = `
      <div class="section-header"><div class="section-title">Détail des tours</div><div class="section-line"></div></div>
      <div class="chart-container">${bars}</div>`;
  }

  const html = `
    <button class="btn-sm" onclick="showPage('sessions')" style="margin-bottom:1.5rem">◀ RETOUR</button>
    <div class="detail-hero">
      <div class="detail-main">
        <div style="font-family:var(--head);font-size:11px;letter-spacing:0.15em;color:var(--muted);margin-bottom:6px">${s.date} · ${s.type || 'Session'}</div>
        <div class="detail-circuit">${s.circuit.split(' ').slice(0,-1).join(' ')} <span>${s.circuit.split(' ').slice(-1)}</span></div>
        <div class="detail-time-display">${s.bestTime || '—'}</div>
        <div style="font-family:var(--head);font-size:13px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase">Meilleur temps</div>
      </div>
      <div class="detail-meta">
        <div class="meta-row"><div class="meta-label">Moto</div><div class="meta-value">${s.moto}</div></div>
        <div class="meta-row"><div class="meta-label">Préparation</div><div class="meta-value">${s.prep || '—'}</div></div>
        <div class="meta-row"><div class="meta-label">Météo</div><div class="meta-value">${s.weather || '—'} · ${s.tempAir}°C air · ${s.tempTrack}°C piste</div></div>
        <div class="meta-row"><div class="meta-label">Pneu</div><div class="meta-value">${s.tyreBrand || '—'} (${s.tyreCompound || '?'})</div></div>
        <div class="meta-row"><div class="meta-label">Pression AV/AR</div><div class="meta-value">${s.pressF || '—'} / ${s.pressR || '—'} bar</div></div>
        <div class="meta-row"><div class="meta-label">Tours</div><div class="meta-value">${s.laps || '—'} tours</div></div>
        <div class="meta-row"><div class="meta-label">Feeling pilote</div><div class="meta-value">${s.feeling}/10</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:2rem">
      <div class="stat-card">
        <div class="stat-label">Temps moyen</div>
        <div class="stat-value" style="font-size:1.4rem">${s.avgTime || '—'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Grip AV / AR</div>
        <div class="stat-value" style="font-size:1.4rem">${s.gripF}/10 · ${s.gripR}/10</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Conditions piste</div>
        <div class="stat-value" style="font-size:1rem;padding-top:8px">${s.trackCond || '—'}</div>
      </div>
    </div>

    ${lapChart}

    ${s.notes ? `
    <div class="section-header"><div class="section-title">Notes Pilote</div><div class="section-line"></div></div>
    <div style="background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--red);padding:1.5rem;font-family:var(--body);font-size:14px;color:var(--text);line-height:1.7;margin-bottom:2rem">${s.notes}</div>
    ` : ''}

    <div style="display:flex;gap:1rem;justify-content:flex-end">
      <button class="btn-lg secondary" onclick="deleteSession(${s.id})">🗑 SUPPRIMER</button>
    </div>
  `;

  document.getElementById('detail-content').innerHTML = html;
  showPage('detail');
}

function deleteSession(id) {
  if (!confirm('Supprimer cette session ?')) return;
  sessions = sessions.filter(s => s.id !== id);
  save();
  updateSessionCount();
  showPage('sessions');
  showToast('Session supprimée', 'red');
}

// =================== COMPARE ===================
function renderCompare(init = false) {
  if (init) {
    const opts = sessions.map(s =>
      `<option value="${s.id}">${s.date} — ${s.circuit} (${s.bestTime || '—'})</option>`
    ).join('');
    ['comp-a','comp-b'].forEach(id => {
      const el = document.getElementById(id);
      const old = el.value;
      el.innerHTML = '<option value="">— choisir —</option>' + opts;
      if (old) el.value = old;
    });
  }

  const aId = parseInt(document.getElementById('comp-a').value);
  const bId = parseInt(document.getElementById('comp-b').value);
  if (!aId || !bId) {
    document.getElementById('compare-result').innerHTML = '';
    return;
  }

  const a = sessions.find(s => s.id === aId);
  const b = sessions.find(s => s.id === bId);
  if (!a || !b) return;

  const timeDiff = parseTime(a.bestTime) - parseTime(b.bestTime);
  const winner = timeDiff < 0 ? 'A' : timeDiff > 0 ? 'B' : null;

  function better(valA, valB, lowerIsBetter = true) {
    const a = parseFloat(valA), bv = parseFloat(valB);
    if (isNaN(a) || isNaN(bv)) return ['—','—'];
    if (lowerIsBetter) return [a <= bv ? 'better' : 'worse', bv <= a ? 'better' : 'worse'];
    return [a >= bv ? 'better' : 'worse', bv >= a ? 'better' : 'worse'];
  }

  const [aBC, bBC] = better(a.bestTime ? parseTime(a.bestTime) : null, b.bestTime ? parseTime(b.bestTime) : null);

  const rows = [
    ['Circuit', a.circuit, b.circuit, null],
    ['Date', a.date, b.date, null],
    ['Moto', a.moto, b.moto, null],
    ['Meilleur temps', a.bestTime||'—', b.bestTime||'—', 'time'],
    ['Temps moyen', a.avgTime||'—', b.avgTime||'—', 'time'],
    ['Météo', a.weather||'—', b.weather||'—', null],
    ['Temp. air', (a.tempAir||'—')+'°C', (b.tempAir||'—')+'°C', null],
    ['Temp. piste', (a.tempTrack||'—')+'°C', (b.tempTrack||'—')+'°C', null],
    ['Pneu', (a.tyreBrand||'—') + ' ' + (a.tyreCompound||''), (b.tyreBrand||'—') + ' ' + (b.tyreCompound||''), null],
    ['Pression AV', (a.pressF||'—')+'bar', (b.pressF||'—')+'bar', null],
    ['Feeling', a.feeling+'/10', b.feeling+'/10', 'higher'],
    ['Grip AV', a.gripF+'/10', b.gripF+'/10', 'higher'],
    ['Grip AR', a.gripR+'/10', b.gripR+'/10', 'higher'],
    ['Tours', a.laps||'—', b.laps||'—', null],
  ];

  const rowsHtml = rows.map(([label, av, bv, type]) => {
    let aCls = '', bCls = '';
    if (type === 'time') {
      const ta = parseTime(av), tb = parseTime(bv);
      if (isFinite(ta) && isFinite(tb)) {
        aCls = ta <= tb ? 'better' : 'worse';
        bCls = tb <= ta ? 'better' : 'worse';
      }
    } else if (type === 'higher') {
      const fa = parseFloat(av), fb = parseFloat(bv);
      if (!isNaN(fa) && !isNaN(fb)) {
        aCls = fa >= fb ? 'better' : 'worse';
        bCls = fb >= fa ? 'better' : 'worse';
      }
    }
    return `<div class="compare-stat">
      <span class="compare-stat-label">${label}</span>
      <div style="display:flex;gap:2rem">
        <span class="compare-stat-val ${aCls}">${av}</span>
        <span class="compare-stat-val ${bCls}">${bv}</span>
      </div>
    </div>`;
  }).join('');

  const diffStr = isFinite(timeDiff) ?
    (timeDiff < 0 ? `Session A plus rapide de ${Math.abs(timeDiff).toFixed(3)}s` :
     timeDiff > 0 ? `Session B plus rapide de ${Math.abs(timeDiff).toFixed(3)}s` : 'Égalité') : '';

  document.getElementById('compare-result').innerHTML = `
    ${diffStr ? `<div style="background:var(--panel);border:1px solid var(--border);border-left:4px solid var(--red);padding:1rem 1.5rem;font-family:var(--mono);font-size:14px;margin-bottom:2rem;color:var(--text)">${diffStr}</div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div style="font-family:var(--head);font-weight:900;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:var(--red)">SESSION A — ${a.circuit}</div>
      <div style="font-family:var(--head);font-weight:900;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text)">SESSION B — ${b.circuit}</div>
    </div>
    <div class="chart-container">${rowsHtml}</div>
  `;
}

// =================== UTILS ===================
function updateSessionCount() {
  document.getElementById('session-count').textContent = sessions.length + ' session' + (sessions.length > 1 ? 's' : '');
}

function showToast(msg, type = 'green') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderColor = type === 'red' ? 'var(--red)' : 'var(--green)';
  t.style.borderLeftColor = type === 'red' ? 'var(--red)' : 'var(--green)';
  t.style.color = type === 'red' ? 'var(--red)' : 'var(--green)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// =================== SEED DATA (for demo) ===================
function seedDemo() {
  if (sessions.length > 0) return;
  const demo = [
    {id:1, circuit:'Circuit de Lédenon', date:'2024-03-15', type:'Roulage libre', laps:18, moto:'Yamaha R6 (2017-2020)', cc:'600', prep:'Semi-préparée', setup:'Suspension allégée',
     weather:'☀️ Ensoleillé', tempAir:'22', tempTrack:'32', humidity:'45', wind:'8', trackCond:'Sèche - Grip optimal',
     tyreBrand:'Pirelli Supercorsa SP', tyreCompound:'S', pressF:'2.1', pressR:'1.9', warmerF:'100°C', warmerR:'100°C',
     bestTime:'1:42.345', avgTime:'1:44.200', firstLap:'1:48.012',
     lapTimes:['1:48.012','1:45.234','1:43.891','1:42.500','1:42.345','1:42.780','1:43.012','1:42.567'],
     feeling:'8', gripF:'8', gripR:'9', notes:'Excellente session ! Bon grip en sortie de virage. Quelques points à améliorer sur la chicane du secteur 2.'},
    {id:2, circuit:'Circuit Paul Ricard', date:'2024-04-02', type:'Chronos', laps:12, moto:'Yamaha R6 (2017-2020)', cc:'600', prep:'Semi-préparée', setup:'',
     weather:'⛅ Nuageux', tempAir:'18', tempTrack:'24', humidity:'62', wind:'15', trackCond:'Sèche - Grip moyen',
     tyreBrand:'Michelin Power GP', tyreCompound:'M', pressF:'2.2', pressR:'2.0', warmerF:'90°C', warmerR:'90°C',
     bestTime:'1:58.123', avgTime:'2:01.500', firstLap:'2:05.000',
     lapTimes:['2:05.000','2:02.345','2:00.123','1:59.500','1:58.123','1:59.001'],
     feeling:'7', gripF:'7', gripR:'7', notes:'Piste pas terrible, grip instable. Mieux sur circuit plus petit.'},
  ];
  sessions = demo;
  save();
  updateSessionCount();
}

// =================== INIT ===================
setDefaultDate();
seedDemo();
renderDashboard();