// ShootersProof - Main Application Script
// Beta v0.1

const state = {
  image: null,
  shots: [],
  calibration: { p1: null, p2: null, pixelsPerInch: null },
  tool: 'mark',
  canvasScale: 1,
};

// ─── NAVIGATION ───────────────────────────────────────────────
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'screen-analysis') renderAnalysis();
  if (id === 'screen-summary') renderSummary();
}

function goToAnalysis() {
  if (state.shots.length < 2) return;
  goTo('screen-analysis');
}

function startOver() {
  state.image = null;
  state.shots = [];
  state.calibration = { p1: null, p2: null, pixelsPerInch: null };
  state.tool = 'mark';
  goTo('screen-upload');
}

// ─── FILE UPLOAD ───────────────────────────────────────────────
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.shots = [];
      state.calibration = { p1: null, p2: null, pixelsPerInch: null };
      goTo('screen-mark');
      setTimeout(drawCanvas, 60);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag and drop
function initDragDrop() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.style.borderColor = 'var(--sp-accent)';
  });
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = '';
  });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload({ target: { files: [file] } });
    }
  });
}

// ─── CANVAS DRAWING ────────────────────────────────────────────
function drawCanvas() {
  const canvas = document.getElementById('targetCanvas');
  if (!state.image || !canvas) return;

  const container = canvas.parentElement;
  const maxW = container.clientWidth || 800;
  const ratio = state.image.height / state.image.width;
  canvas.width = Math.min(maxW, state.image.width);
  canvas.height = canvas.width * ratio;
  state.canvasScale = canvas.width / state.image.width;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);

  // Calibration points
  const cal = state.calibration;
  if (cal.p1) {
    drawCalPoint(ctx, cal.p1.x, cal.p1.y);
  }
  if (cal.p1 && cal.p2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,169,74,0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cal.p1.x, cal.p1.y);
    ctx.lineTo(cal.p2.x, cal.p2.y);
    ctx.stroke();
    ctx.restore();
    drawCalPoint(ctx, cal.p2.x, cal.p2.y);
  }

  // MPI
  const mpi = getMPI();

  // Shot markers
  state.shots.forEach((s, i) => {
    const cx = s.px * state.canvasScale;
    const cy = s.py * state.canvasScale;

    // Outer ring
    ctx.save();
    ctx.strokeStyle = 'rgba(226,75,74,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair
    ctx.strokeStyle = '#e24b4a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy); ctx.lineTo(cx + 11, cy);
    ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy + 11);
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.fillStyle = 'rgba(226,75,74,0.9)';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(i + 1, cx + 10, cy - 7);
  });

  // MPI marker
  if (mpi && state.shots.length >= 2) {
    const mx = mpi.x * state.canvasScale;
    const my = mpi.y * state.canvasScale;
    ctx.save();
    ctx.strokeStyle = '#1d9e75';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx - 9, my); ctx.lineTo(mx + 9, my);
    ctx.moveTo(mx, my - 9); ctx.lineTo(mx, my + 9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(29,158,117,0.9)';
    ctx.font = '10px monospace';
    ctx.fillText('MPI', mx + 7, my - 5);
    ctx.restore();
  }

  updateShotTable();
  updateAnalyzeBtn();
}

function drawCalPoint(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = 'rgba(200,169,74,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ─── CANVAS INTERACTIONS ───────────────────────────────────────
function initCanvasEvents() {
  const canvas = document.getElementById('targetCanvas');
  if (!canvas) return;

  canvas.addEventListener('click', function (e) {
    if (!state.image) return;
    const { px, py, cx, cy } = getCanvasCoords(e, this);

    if (state.tool === 'mark') {
      state.shots.push({ px, py });
      drawCanvas();
    } else if (state.tool === 'calibrate') {
      if (!state.calibration.p1) {
        state.calibration.p1 = { x: cx, y: cy };
        document.getElementById('calStatus').textContent = 'Point 1 set — click second point';
        document.getElementById('calStatus').className = 'cal-status';
      } else if (!state.calibration.p2) {
        state.calibration.p2 = { x: cx, y: cy };
        computeCalibration();
      }
      drawCanvas();
    }
  });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (!state.image) return;
    const { px, py } = getCanvasCoords(e, this);
    const threshold = 15 / state.canvasScale;
    const before = state.shots.length;
    state.shots = state.shots.filter(s => Math.hypot(s.px - px, s.py - py) > threshold);
    if (state.shots.length < before) drawCanvas();
  });
}

function getCanvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { cx, cy, px: cx / state.canvasScale, py: cy / state.canvasScale };
}

// ─── TOOLS ────────────────────────────────────────────────────
function setTool(t) {
  state.tool = t;
  document.getElementById('toolMark').classList.toggle('active', t === 'mark');
  document.getElementById('toolCalib').classList.toggle('active', t === 'calibrate');
  document.getElementById('toolHint').textContent = t === 'mark'
    ? '> click on each bullet hole to mark it — right-click a marker to remove it'
    : '> click two points that represent a known distance (e.g. two corners of a 1" grid square)';
  if (t === 'calibrate') {
    state.calibration.p1 = null;
    state.calibration.p2 = null;
    drawCanvas();
  }
}

function clearAllShots() {
  if (!confirm('Remove all shot markers?')) return;
  state.shots = [];
  drawCanvas();
}

function updateAnalyzeBtn() {
  const btn = document.getElementById('analyzeBtn');
  if (btn) btn.disabled = state.shots.length < 2;
}

// ─── CALIBRATION ──────────────────────────────────────────────
function computeCalibration() {
  const { p1, p2 } = state.calibration;
  const pixDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const realDist = parseFloat(document.getElementById('calDistance').value) || 1;
  const unit = document.getElementById('calUnit').value;
  let realInches = realDist;
  if (unit === 'cm') realInches = realDist / 2.54;
  if (unit === 'mm') realInches = realDist / 25.4;
  state.calibration.pixelsPerInch = (pixDist / state.canvasScale) / realInches;
  const el = document.getElementById('calStatus');
  el.textContent = `✓ Calibrated — ${state.calibration.pixelsPerInch.toFixed(1)} px/inch`;
  el.className = 'cal-status done';
  setTool('mark');
}

// ─── STATISTICS ───────────────────────────────────────────────
function getMPI() {
  if (!state.shots.length) return null;
  return {
    x: state.shots.reduce((s, p) => s + p.px, 0) / state.shots.length,
    y: state.shots.reduce((s, p) => s + p.py, 0) / state.shots.length,
  };
}

function sdOf(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (arr.length - 1));
}

function computeStats() {
  const shots = state.shots;
  const n = shots.length;
  if (n < 2) return null;

  const mpi = getMPI();
  const ppi = state.calibration.pixelsPerInch;
  const dists = shots.map(s => Math.hypot(s.px - mpi.x, s.py - mpi.y));
  const mr = dists.reduce((a, b) => a + b, 0) / n;

  let es = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      es = Math.max(es, Math.hypot(shots[i].px - shots[j].px, shots[i].py - shots[j].py));

  const xs = shots.map(s => s.px);
  const ys = shots.map(s => s.py);
  const sdx = sdOf(xs);
  const sdy = sdOf(ys);
  const cep = mr * 0.94;
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const fom = (width + height) / 2;

  const dist = parseFloat(document.getElementById('shootDistance')?.value) || 100;
  const dUnit = document.getElementById('distanceUnit')?.value || 'yards';
  const distYards = dUnit === 'yards' ? dist : dUnit === 'meters' ? dist * 1.094 : dist / 3;

  const toIn = v => ppi ? v / ppi : null;
  const toMOA = v => (ppi && distYards) ? (v / ppi / distYards) * 95.5 : null;

  return {
    n, mpi, shots, distYards, calibrated: !!ppi,
    rawMR: mr, rawES: es, rawSDX: sdx, rawSDY: sdy, rawCEP: cep, rawFOM: fom,
    mr: toIn(mr), es: toIn(es), sdx: toIn(sdx), sdy: toIn(sdy),
    cep: toIn(cep), fom: toIn(fom),
    mrMOA: toMOA(mr), esMOA: toMOA(es),
  };
}

function getConfidence(n) {
  if (n < 3)  return { score: 5,  label: 'Very low',  color: '#e24b4a', note: `${n} shot gives almost no statistical information. Group size at this sample is essentially random.` };
  if (n < 5)  return { score: 18, label: 'Very low',  color: '#e24b4a', note: `3–4 shots: extreme spread is dominated by luck, not true dispersion. Conclusions are unreliable.` };
  if (n < 8)  return { score: 35, label: 'Low',       color: '#ef9f27', note: `5 shots is the traditional standard, but statistically it tells us little. Mean Radius is more reliable than ES here.` };
  if (n < 12) return { score: 54, label: 'Moderate',  color: '#ef9f27', note: `8–11 shots: meaningful patterns are beginning to emerge. SD estimates still have wide confidence intervals.` };
  if (n < 18) return { score: 72, label: 'Good',      color: '#c8a94a', note: `12–17 shots: solid data. Group statistics are becoming reliable. Adding more groups will confirm the picture.` };
  if (n < 25) return { score: 86, label: 'Very good', color: '#1d9e75', note: `18–24 shots: this is where ballistics researchers say meaningful conclusions can be drawn about a load or rifle.` };
  return       { score: 95, label: 'Excellent',       color: '#1d9e75', note: `${n} shots: high confidence. These statistics reliably represent this rifle/ammo combination's true dispersion.` };
}

// ─── SHOT TABLE ───────────────────────────────────────────────
function updateShotTable() {
  const mpi = getMPI();
  const ppi = state.calibration.pixelsPerInch;
  const tbody = document.getElementById('shotTableBody');
  const countEl = document.getElementById('shotCount');
  if (!tbody) return;

  tbody.innerHTML = state.shots.map((s, i) => {
    const dx = mpi ? s.px - mpi.x : 0;
    const dy = mpi ? s.py - mpi.y : 0;
    const dist = Math.hypot(dx, dy);
    const fmt = v => ppi ? (v / ppi).toFixed(3) + '"' : '—';
    const fmtSigned = v => ppi ? ((v >= 0 ? '+' : '') + (v / ppi).toFixed(3) + '"') : '—';
    return `<tr><td>${i + 1}</td><td>${fmtSigned(dx)}</td><td>${fmtSigned(dy)}</td><td>${fmt(dist)}</td></tr>`;
  }).join('');

  if (countEl) countEl.textContent = state.shots.length + ' shot' + (state.shots.length !== 1 ? 's' : '');
}

// ─── ANALYSIS RENDER ──────────────────────────────────────────
function renderAnalysis() {
  const stats = computeStats();
  if (!stats) return;

  const dist = document.getElementById('shootDistance')?.value || '?';
  const dUnit = document.getElementById('distanceUnit')?.value || 'yards';
  const sub = document.getElementById('analysisSubtitle');
  if (sub) sub.textContent = `${stats.n} shots at ${dist} ${dUnit}`;

  const conf = getConfidence(stats.n);
  document.getElementById('confScore').textContent = conf.label;
  document.getElementById('confScore').style.color = conf.color;
  document.getElementById('confBar').style.width = conf.score + '%';
  document.getElementById('confBar').style.background = conf.color;
  document.getElementById('confNote').textContent = conf.note;

  const fmt = (v, d) => v !== null && v !== undefined ? v.toFixed(d) : '—';
  const cards = [
    { label: 'Shots fired',     value: stats.n,              unit: '',                              sub: '',                                      highlight: false },
    { label: 'Extreme spread',  value: fmt(stats.es, 3),     unit: stats.calibrated ? '"' : ' px', sub: stats.esMOA ? fmt(stats.esMOA, 2) + ' MOA' : 'calibrate for MOA', highlight: false },
    { label: 'Mean radius',     value: fmt(stats.mr, 3),     unit: stats.calibrated ? '"' : ' px', sub: stats.mrMOA ? fmt(stats.mrMOA, 2) + ' MOA' : '',                highlight: true  },
    { label: 'CEP (50%)',       value: fmt(stats.cep, 3),    unit: stats.calibrated ? '"' : ' px', sub: 'radius covering 50% of shots',          highlight: false },
    { label: 'SD horizontal',   value: fmt(stats.sdx, 3),    unit: stats.calibrated ? '"' : ' px', sub: 'left–right dispersion',                 highlight: false },
    { label: 'SD vertical',     value: fmt(stats.sdy, 3),    unit: stats.calibrated ? '"' : ' px', sub: 'up–down dispersion',                    highlight: false },
    { label: 'Figure of merit', value: fmt(stats.fom, 3),    unit: stats.calibrated ? '"' : ' px', sub: 'avg of width & height',                 highlight: false },
  ];

  document.getElementById('statsGrid').innerHTML = cards.map(c =>
    `<div class="stat-card${c.highlight ? ' highlight' : ''}">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}<span class="stat-unit">${c.unit}</span></div>
      <div class="stat-sub">${c.sub}</div>
    </div>`
  ).join('');

  renderScatterPlot(stats);
}

function renderScatterPlot(stats) {
  const canvas = document.getElementById('analysisCanvas');
  if (!canvas) return;
  const size = Math.min(canvas.parentElement.clientWidth || 500, 500);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, size, size);

  const pad = 44;
  const inner = size - pad * 2;
  const shots = stats.shots;
  const mpi = stats.mpi;

  const xs = shots.map(s => s.px);
  const ys = shots.map(s => s.py);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys)
  ) * 1.6 || 100;

  const toC = (px, py) => ({
    x: pad + ((px - mpi.x) / span + 0.5) * inner,
    y: pad + ((py - mpi.y) / span + 0.5) * inner,
  });

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const p = pad + (i / 4) * inner;
    ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, pad + inner); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(pad + inner, p); ctx.stroke();
  }

  // Center lines
  const center = pad + inner / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.moveTo(center, pad); ctx.lineTo(center, pad + inner); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, center); ctx.lineTo(pad + inner, center); ctx.stroke();
  ctx.setLineDash([]);

  // CEP circle
  if (stats.rawMR) {
    const cepR = (stats.rawMR * 0.94 / span) * inner;
    ctx.strokeStyle = 'rgba(29,158,117,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(center, center, cepR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(29,158,117,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('CEP', center + cepR + 3, center - 3);
  }

  // ES circle
  if (stats.rawES) {
    const esR = (stats.rawES / 2 / span) * inner;
    ctx.strokeStyle = 'rgba(200,169,74,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(center, center, esR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Shot dots
  shots.forEach((s, i) => {
    const c = toC(s.px, s.py);
    ctx.fillStyle = '#e24b4a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px monospace';
    ctx.fillText(i + 1, c.x + 6, c.y - 3);
  });

  // MPI dot
  ctx.strokeStyle = '#1d9e75';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(center - 8, center); ctx.lineTo(center + 8, center);
  ctx.moveTo(center, center - 8); ctx.lineTo(center, center + 8);
  ctx.stroke();

  // Legend
  const legends = [
    { color: '#e24b4a', label: '● shots' },
    { color: '#1d9e75', label: '+ MPI' },
    { color: 'rgba(29,158,117,0.6)', label: '- - CEP 50%' },
    { color: 'rgba(200,169,74,0.5)', label: '- - ES boundary' },
  ];
  let lx = pad;
  legends.forEach(l => {
    ctx.fillStyle = l.color;
    ctx.font = '10px monospace';
    ctx.fillText(l.label, lx, size - 10);
    lx += ctx.measureText(l.label).width + 16;
  });
}

// ─── SUMMARY ──────────────────────────────────────────────────
function renderSummary() {
  const stats = computeStats();
  if (!stats) return;
  const dist = document.getElementById('shootDistance')?.value || '?';
  const dUnit = document.getElementById('distanceUnit')?.value || 'yards';
  const ppi = state.calibration.pixelsPerInch;
  const fmt = (v, d) => v !== null ? (v / (ppi || 1)).toFixed(d) + (ppi ? '"' : 'px') : '—';
  document.getElementById('summaryTitle').textContent = `${stats.n} shots @ ${dist} ${dUnit}`;
  document.getElementById('summaryStats').textContent =
    `ES: ${fmt(stats.rawES, 3)} | MR: ${fmt(stats.rawMR, 3)} | CEP: ${fmt(stats.rawMR * 0.94, 3)} | Confidence: ${getConfidence(stats.n).label}`;
}

// ─── AUTO DETECT ──────────────────────────────────────────────
async function runAutoDetect() {
  if (!state.image) return;
  const aiDot = document.getElementById('aiDot');
  const aiText = document.getElementById('aiStatusText');
  aiDot.className = 'ai-dot working';
  aiText.textContent = 'Analyzing image for bullet holes...';

  try {
    const canvas = document.getElementById('targetCanvas');
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `Analyze this target image and identify bullet holes. For each bullet hole, provide its position as a percentage of image dimensions (0,0 = top-left, 100,100 = bottom-right).
Return ONLY a JSON object, no other text:
{"holes": [{"x": 45.2, "y": 52.1}], "count": 2, "notes": "brief description"}
If no holes found: {"holes": [], "count": 0, "notes": "reason"}` }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    if (result.holes?.length > 0) {
      result.holes.forEach(h => {
        state.shots.push({
          px: (h.x / 100) * state.image.width,
          py: (h.y / 100) * state.image.height,
        });
      });
      drawCanvas();
      aiDot.className = 'ai-dot';
      aiText.textContent = `Auto-detected ${result.holes.length} potential hole${result.holes.length !== 1 ? 's' : ''}. ${result.notes || ''} Review and adjust as needed.`;
    } else {
      aiDot.className = 'ai-dot';
      aiText.textContent = `Auto-detection: ${result.notes || 'No holes found'}. Mark holes manually by clicking.`;
    }
  } catch (err) {
    aiDot.className = 'ai-dot';
    aiText.textContent = 'Auto-detection unavailable — mark holes manually by clicking on the target.';
  }
}

// ─── EQUIPMENT ────────────────────────────────────────────────
function toggleReloadFields() {
  const v = document.getElementById('ammoType')?.value;
  const el = document.getElementById('reloadFields');
  if (el) el.style.display = v === 'reload' ? 'grid' : 'none';
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDragDrop();
  initCanvasEvents();
});
