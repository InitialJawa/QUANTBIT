// dashboard_v4.js
// Phase 1: Shell & Basic Navigation

let activeConfig = 'prod';
let viewModes = {
    leaders: 'table',
    turnaround: 'cards',
    exit: 'cards'
};

// Initialize V4
document.addEventListener('DOMContentLoaded', () => {
    console.log("ISI V4 Terminal Initialized");
    
    // Check if we are on mobile
    const isMobile = window.innerWidth <= 1024;
    
    if (isMobile) {
        // Enforce cards view on mobile
        viewModes.leaders = 'cards';
        viewModes.turnaround = 'cards';
        viewModes.exit = 'cards';
    }

    renderAll();
});

// Tab Switching Logic
function switchTab(tabId) {
    // Desktop Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-target="tab-${tabId}"]`);
    if(navItem) navItem.classList.add('active');

    // Mobile Nav
    document.querySelectorAll('.mobile-nav-btn').forEach(el => el.classList.remove('active'));
    const mobBtn = document.querySelector(`.mobile-nav-btn[onclick="switchTab('${tabId}')"]`);
    if(mobBtn) mobBtn.classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const content = document.getElementById(`tab-${tabId}`);
    if(content) content.classList.add('active');
}

// Config Switching Logic
function setConfig(cfg) {
    activeConfig = cfg;
    document.querySelectorAll('.config-btn').forEach(el => el.classList.remove('active'));
    const btn = document.querySelector(`.config-btn[onclick="setConfig('${cfg}')"]`);
    if(btn) btn.classList.add('active');
    
    // Re-render components that depend on config
    renderAll();
}

// View Toggle (Cards vs Table)
function toggleView(tab, mode) {
    // Only allow toggle on desktop
    if(window.innerWidth <= 1024) return;
    
    viewModes[tab] = mode;
    console.log(`Switched ${tab} to ${mode} view`);
    
    // Update active button state
    const toggleContainer = document.getElementById(`v4-${tab === 'leaders' ? 'ld' : tab}-view-toggle`);
    if (toggleContainer) {
        toggleContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        const btn = toggleContainer.querySelector(`button[onclick="toggleView('${tab}', '${mode}')"]`);
        if (btn) btn.classList.add('active');
    }
    
    // Re-render specific tab
    if(tab === 'leaders') renderLeaders();
    if(tab === 'turnaround') renderTurnaround();
    if(tab === 'exit') renderExit();
}

// Global Render Manager
function renderAll() {
    renderMarket();
    renderLeaders();
    renderTurnaround();
    renderExit();
    renderSimulation();
    renderIntelligencePanel();
}

// Phase 2: Market Tab Rendering
let liveMarketData = null;
let regimeHistory = [];

async function loadData() {
    try {
        const liveRes = await fetch('data/live_market.json');
        if(liveRes.ok) liveMarketData = await liveRes.json();
    } catch(e) { console.warn(e); }
    
    try {
        const regimeRes = await fetch('data/regime_history.json');
        if(regimeRes.ok) regimeHistory = await regimeRes.json();
    } catch(e) { console.warn(e); }

    renderAll();
}

function getStatusColorClass(status) {
    if(status === 'SAFE' || status === 'RISK ON' || status === 'ACCUMULATE') return 'risk-on';
    if(status === 'WARNING' || status === 'NETRAL' || status === 'HOLD' || status === 'WAIT') return 'netral';
    return 'risk-off';
}

function getTrendText(score_gap_change) {
    if (score_gap_change > 2) return "Strongly Improving";
    if (score_gap_change > 0) return "Improving";
    if (score_gap_change < -2) return "Strongly Weakening";
    if (score_gap_change < 0) return "Weakening";
    return "Stable";
}

function renderMarket() {
    console.log("Rendering Market Tab...");
    if (typeof RS === 'undefined' || typeof MKT === 'undefined') return;

    const rc = RS.radar_context || {};

    // SECTION 1: HERO
    const statusMap = { SAFE: 'RISK ON', WARNING: 'NETRAL', DANGER: 'RISK OFF' };
    const actionMap = { ACCUMULATE: 'AKUMULASI', HOLD: 'TAHAN', WAIT: 'TUNGGU', REDUCE: 'KURANGI' };
    
    const displayStatus = statusMap[RS.status] || RS.status;
    const displayAction = actionMap[RS.action] || RS.action;
    
    const statusColor = getStatusColorClass(displayStatus);
    const actionColor = getStatusColorClass(RS.action);

    const stEl = document.getElementById('v4-hero-status');
    if(stEl) {
        stEl.textContent = displayStatus;
        stEl.className = `hero-status text-${statusColor}`;
    }
    const acEl = document.getElementById('v4-hero-action');
    if(acEl) {
        acEl.textContent = displayAction;
        acEl.className = `hero-action bg-${actionColor}`;
    }
    
    const trendEl = document.getElementById('v4-hero-trend');
    if(trendEl) {
        const trend = getTrendText(rc.score_gap_5d_change || 0);
        trendEl.innerHTML = `Trend vs Yesterday: <span class="text-primary">${trend}</span>`;
    }
    const capEl = document.getElementById('v4-hero-cap');
    if(capEl) {
        capEl.textContent = RS.capital_deployment !== undefined ? RS.capital_deployment + '%' : '--';
    }

    if(document.getElementById('v4-hero-health')) document.getElementById('v4-hero-health').textContent = RS.market_health;
    if(document.getElementById('v4-hero-opportunity')) document.getElementById('v4-hero-opportunity').textContent = RS.opportunity;
    if(document.getElementById('v4-hero-risk')) document.getElementById('v4-hero-risk').textContent = RS.risk;
    if(document.getElementById('v4-hero-confidence')) document.getElementById('v4-hero-confidence').textContent = RS.confidence;

    // SECTION 2: SNAPSHOT
    const snapshotEl = document.getElementById('v4-market-snapshot');
    if (snapshotEl) {
        const ihsgObj = liveMarketData ? liveMarketData.ihsg : MKT.ihsg;
        const usdObj = liveMarketData ? liveMarketData.usdidr : MKT.usdidr;
        
        let ihsgVal = ihsgObj ? (ihsgObj.price || ihsgObj.value) : '--';
        let ihsgPct = ihsgObj ? (ihsgObj.change_pct || ihsgObj.daily) : '--';
        let usdVal = usdObj ? (usdObj.price || usdObj.value) : '--';
        let usdPct = usdObj ? (usdObj.change_pct || usdObj.daily) : '--';
        
        const scoreGap = rc.score_gap !== undefined ? rc.score_gap.toFixed(1) : '--';
        const breadth = rc.breadth_above_60 !== undefined ? `${rc.breadth_above_60}/${rc.watchlist_count || '-'}` : '--';
        const lu = ihsgObj && ihsgObj.timestamp ? ihsgObj.timestamp.split(' ')[1] : (MKT.market_last_update || '').split(' ')[1] || '';

        const ihsgInterp = ihsgPct > 0 ? 'Bullish Day' : ihsgPct < 0 ? 'Bearish Day' : 'Flat';
        const usdInterp = usdPct < 0 ? 'Rupiah Strengthening' : usdPct > 0 ? 'Rupiah Weakening' : 'Stable';
        const gapInterp = rc.score_gap_5d_change > 0 ? 'Gap Widening' : rc.score_gap_5d_change < 0 ? 'Gap Narrowing' : 'Stable Gap';
        const brInterp = rc.breadth_above_60 > 5 ? 'Broad Participation' : 'Narrow Participation';

        const snapCards = [
            { t: 'IHSG', v: ihsgVal.toLocaleString(), c: ihsgPct, ts: lu, interp: ihsgInterp, ic: ihsgPct > 0 ? 'bg-risk-on' : 'bg-risk-off' },
            { t: 'USDIDR', v: usdVal.toLocaleString(), c: usdPct, ts: lu, interp: usdInterp, ic: usdPct < 0 ? 'bg-risk-on' : 'bg-risk-off' },
            { t: 'Score Gap', v: scoreGap, c: rc.score_gap_5d_change || 0, ts: 'Daily', interp: gapInterp, ic: rc.score_gap_5d_change > 0 ? 'bg-risk-on' : 'bg-risk-off' },
            { t: 'Breadth >60', v: breadth, c: 0, ts: 'Daily', interp: brInterp, ic: rc.breadth_above_60 > 5 ? 'bg-risk-on' : 'bg-netral' }
        ];

        let snapHtml = '';
        snapCards.forEach(c => {
            const chgColor = c.c > 0 ? 'text-risk-on' : c.c < 0 ? 'text-risk-off' : 'text-secondary';
            const chgSign = c.c > 0 ? '+' : '';
            snapHtml += `
                <div class="card" style="margin-bottom:0; display:flex; flex-direction:column;">
                    <div class="card-title">${c.t}</div>
                    <div class="metric-val">${c.v}</div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                        <span class="${chgColor}">${chgSign}${c.c}%</span>
                        <span class="text-secondary">${c.ts}</span>
                    </div>
                    <div style="margin-top:auto;">
                        <div class="snapshot-interp ${c.ic}">${c.interp}</div>
                    </div>
                </div>`;
        });
        snapshotEl.innerHTML = snapHtml;
    }

    // PERFORMANCE BANNER
    const pbEl = document.getElementById('v4-perf-banner');
    if (pbEl && typeof BM !== 'undefined' && BM.length > 0) {
        // Calculate Growth of 100M
        const startB = BM[0].config_b, endB = BM[BM.length-1].config_b;
        const startF = BM[0].config_f, endF = BM[BM.length-1].config_f;
        const startI = BM[0].ihsg, endI = BM[BM.length-1].ihsg;

        const growthB = (endB / startB) * 100000000;
        const growthF = (endF / startF) * 100000000;
        const growthI = (endI / startI) * 100000000;

        const formatRp = (v) => 'Rp ' + (v/1000000).toFixed(1) + 'M';

        pbEl.innerHTML = `
            <div class="perf-item">
                <div class="perf-title">Growth of Rp100M (IHSG)</div>
                <div class="perf-val">${formatRp(growthI)}</div>
            </div>
            <div class="perf-item">
                <div class="perf-title">Growth of Rp100M (Config B)</div>
                <div class="perf-val">${formatRp(growthB)}</div>
            </div>
            <div class="perf-item">
                <div class="perf-title">Growth of Rp100M (Config F)</div>
                <div class="perf-val lead">${formatRp(growthF)}</div>
            </div>
        `;
    }

    // SECTION 3: AI BRIEF
    const briefEl = document.getElementById('v4-ai-brief');
    if (briefEl) {
        const summaryText = RS.detail_message || RS.rationale || '--';
        briefEl.innerHTML = `
            <details class="ai-brief-details">
                <summary>AI Summary: ${summaryText.split('.')[0]}.</summary>
                <div style="font-size:0.875rem; line-height:1.6; color:var(--text-secondary); margin-top:1rem;">
                    <p style="margin-bottom:1rem;">${summaryText}</p>
                    <div class="grid-4" style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem;">
                        <div><span class="text-xs">Risk</span><br><span class="text-primary">${RS.risk}%</span></div>
                        <div><span class="text-xs">Action</span><br><span class="text-${actionColor}">${displayAction}</span></div>
                        <div><span class="text-xs">Deployment</span><br><span class="text-primary">${RS.capital_deployment}%</span></div>
                    </div>
                </div>
            </details>`;
    }

    // SECTION 4: TIMELINE (Visual)
    const tlEl = document.getElementById('v4-timeline');
    if (tlEl && regimeHistory.length > 0) {
        let tlHtml = '';
        const limit = Math.min(regimeHistory.length, 5);
        for(let i=0; i<limit; i++) {
            const d = regimeHistory[i];
            const sClass = getStatusColorClass(d.regime);
            const aClass = getStatusColorClass(d.action);
            tlHtml += `
                <div class="timeline-item ${sClass}">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                        <span class="text-xs text-secondary font-bold" style="width:80px;">${d.date}</span>
                        <span class="badge bg-${sClass}">${d.regime}</span>
                        <span class="badge bg-${aClass}">${d.action}</span>
                    </div>
                    <div class="text-sm text-secondary" style="margin-left: 88px;">${d.note || ''}</div>
                </div>`;
        }
        tlEl.innerHTML = tlHtml;
    }
}

function getConviction(score, rank, gap) {
    if (score >= 70 && gap >= 2) return { text: 'HIGH', class: 'conviction-badge conviction-high' };
    if (score >= 60) return { text: 'MEDIUM', class: 'conviction-badge conviction-medium' };
    return { text: 'LOW', class: 'conviction-badge conviction-low' };
}

function getExplanation(r) {
    const factors = [
        { name: 'Quality', val: Number(r.quality) },
        { name: 'Growth', val: Number(r.growth) },
        { name: 'Value', val: Number(r.value) },
        { name: 'Momentum', val: Number(r.momentum) }
    ].sort((a,b) => b.val - a.val);
    
    const dom = factors[0];
    const weak = factors[3];
    
    if (dom.val > 70 && weak.val > 50) return `${dom.name} dominan dan fundamental solid.`;
    if (dom.val > 70) return `${dom.name} sangat kuat tetapi ${weak.name} menjadi kelemahan.`;
    return `Kondisi berimbang, dipimpin oleh ${dom.name}.`;
}

function renderLeaders() {
    console.log("Rendering Leaders Tab...", viewModes.leaders);
    if (typeof L === 'undefined' || !L.length) return;

    const isMobile = window.innerWidth <= 1024;
    const mode = isMobile ? 'cards' : viewModes.leaders;
    
    const toggleEl = document.getElementById('v4-ld-view-toggle');
    if (toggleEl) toggleEl.style.display = isMobile ? 'none' : 'flex';

    // Need computeFinalScore which was in index.html, let's redefine or use it if available
    const w = activeConfig === 'prod' ? CW_F : CW_B;
    const cfs = (r, w) => r.quality * w.quality + r.growth * w.growth + r.value * w.value + r.momentum * w.momentum;
    const scored = L.map(r => ({ ...r, _score: typeof computeFinalScore === 'function' ? computeFinalScore(r, w) : cfs(r, w) }));
    scored.sort((a,b) => b._score - a._score);

    // Merge rank_change from RK (warehouse-derived) + EX fallback
    const rkMap = {};
    if (typeof RK !== 'undefined') Object.assign(rkMap, RK);
    if (typeof EX !== 'undefined') {
        EX.forEach(e => { if (rkMap[e.ticker] === undefined) rkMap[e.ticker] = Number(e.rank_change || 0); });
    }
    scored.forEach(r => {
        if (rkMap[r.ticker] !== undefined) r.rank_change = rkMap[r.ticker];
    });
    
    // SECTION 1: HEADER
    const cfgTitle = document.getElementById('v4-ld-config-title');
    if (cfgTitle) cfgTitle.textContent = activeConfig === 'prod' ? 'Config F Leaders' : 'Config B Leaders';
    
    const top5 = scored.slice(0, 5);
    const avgScore = top5.reduce((s, r) => s + r._score, 0) / (top5.length || 1);
    const top5ScoreEl = document.getElementById('v4-ld-top5-score');
    if(top5ScoreEl) {
        top5ScoreEl.textContent = avgScore.toFixed(1);
        top5ScoreEl.style.color = avgScore > 70 ? 'var(--color-risk-on)' : avgScore > 50 ? 'var(--color-netral)' : 'var(--color-risk-off)';
    }

    const rc = RS.radar_context || {};
    const brEl = document.getElementById('v4-ld-breadth');
    if(brEl) {
        brEl.innerHTML = `Strongest: <span class="text-primary">${rc.strongest_factor||'--'}</span> | Breadth >60: <span class="text-primary">${rc.breadth_above_60||0}/${rc.watchlist_count||0}</span>`;
    }

    // SECTION 2 & 3: CONTAINER
    const cont = document.getElementById('v4-leaders-container');
    if (!cont) return;

    if (mode === 'cards') {
        let html = '<div class="grid-3">';
        scored.forEach((r, idx) => {
            const gap = idx < scored.length - 1 ? r._score - scored[idx+1]._score : 0;
            const conv = getConviction(r._score, idx+1, gap);
            const expl = getExplanation(r);
            const sym = r.ticker.split('.')[0];
            
            const makeBar = (val, color) => `
                <div class="opp-factor-row">
                    <div class="opp-factor-label">${color[0].toUpperCase()}</div>
                    <div class="opp-factor-bar-bg">
                        <div class="opp-factor-bar-fill" style="width:${val}%; background-color:var(--color-${val>=60?'risk-on':val>=40?'netral':'risk-off'})"></div>
                    </div>
                </div>`;
                
            html += `
                <div class="card opp-card interactive-card" onclick="openBottomSheet('${sym}')">
                    <div class="opp-header">
                        <div>
                            <div class="opp-ticker">${sym}</div>
                            <div class="${conv.class}" style="margin-top:0.5rem;">${conv.text}</div>
                        </div>
                        <div class="opp-score">${r._score.toFixed(1)}</div>
                    </div>
                    <div>
                        ${makeBar(r.quality, 'quality')}
                        ${makeBar(r.growth, 'growth')}
                        ${makeBar(r.value, 'value')}
                        ${makeBar(r.momentum, 'momentum')}
                    </div>
                    <div class="opp-explanation">${expl}</div>
                </div>`;
        });
        html += '</div>';
        cont.innerHTML = html;
    } else {
        // MATRIX VIEW
        let html = '<div class="card" style="overflow-x:auto;"><table class="factor-matrix"><thead><tr><th>Rank</th><th>Ticker</th><th>Score</th><th>Q</th><th>G</th><th>V</th><th>M</th><th>Conviction</th><th>Rotation</th></tr></thead><tbody>';
        scored.forEach((r, idx) => {
            const gap = idx < scored.length - 1 ? r._score - scored[idx+1]._score : 0;
            const conv = getConviction(r._score, idx+1, gap);
            const sym = r.ticker.split('.')[0];
            const colorize = (v) => `<span style="color:var(--color-${v>=60?'risk-on':v>=40?'netral':'risk-off'})">${Number(v).toFixed(1)}</span>`;
            
            html += `<tr class="interactive-row" onclick="openBottomSheet('${sym}')">
                <td class="font-bold text-secondary">#${idx+1}</td>
                <td class="font-bold text-primary">${sym}</td>
                <td class="font-bold">${colorize(r._score)}</td>
                <td>${colorize(r.quality)}</td>
                <td>${colorize(r.growth)}</td>
                <td>${colorize(r.value)}</td>
                <td>${colorize(r.momentum)}</td>
                <td><span class="${conv.class}">${conv.text}</span></td>
                <td>${(() => { const c = r.rank_change||0; if (c > 5) return '<span class="rot-new">★ NEW</span>'; if (c > 0) return `<span class="rot-up">↑ UP (${c})</span>`; if (c < 0) return `<span class="rot-down">↓ DOWN (${Math.abs(c)})</span>`; return '<span class="rot-unc">→ UNCHANGED</span>'; })()}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        cont.innerHTML = html;
    }

    // SECTION 4: TOP 5 HEALTH
    const hb = document.getElementById('v4-ld-health-bars');
    if (hb && top5.length > 0) {
        const avg = (key) => top5.reduce((s, r) => s + Number(r[key]), 0) / top5.length;
        const q = avg('quality'), g = avg('growth'), v = avg('value'), m = avg('momentum');
        const makeHBar = (lbl, val) => `
            <div style="margin-bottom:0.75rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.25rem;">
                    <span>${lbl}</span><span class="text-primary font-bold">${val.toFixed(1)}</span>
                </div>
                <div class="opp-factor-bar-bg" style="height:6px;">
                    <div class="opp-factor-bar-fill" style="width:${val}%; background-color:var(--color-${val>=60?'risk-on':val>=40?'netral':'risk-off'})"></div>
                </div>
            </div>`;
        hb.innerHTML = makeHBar('Quality', q) + makeHBar('Growth', g) + makeHBar('Value', v) + makeHBar('Momentum', m);
    }

    // SECTION 5: ROTATION
    const rotEl = document.getElementById('v4-ld-rotation');
    if (rotEl) {
        let rotHtml = '';
        const limit = Math.min(scored.length, 6);
        for(let i=0; i<limit; i++) {
            const sym = scored[i].ticker.split('.')[0];
            const chg = Number(scored[i].rank_change || 0);
            let state = '<span class="rot-unc">→ UNCHANGED</span>';
            if (chg > 5) state = '<span class="rot-new">★ NEW</span>';
            else if (chg > 0) state = `<span class="rot-up">↑ UP (${chg})</span>`;
            else if (chg < 0) state = `<span class="rot-down">↓ DOWN (${Math.abs(chg)})</span>`;
            
            rotHtml += `
                <div class="rotation-row">
                    <span class="font-bold text-primary">${sym}</span>
                    <span class="text-sm">${state}</span>
                </div>`;
        }
        rotEl.innerHTML = rotHtml;
    }
}

// Phase 5: Turnaround / Recovery Rendering
function renderTurnaround() {
    console.log("Rendering Turnaround Tab...");
    if (typeof T === 'undefined') return;
    
    const arr = T.value || T;
    if (!arr || !arr.length) return;

    // Filter to those with at least one match
    const tk = arr.filter(r => 
        r.context_match === true || String(r.context_match).toLowerCase() === "true" || 
        r.transition_match === true || String(r.transition_match).toLowerCase() === "true"
    );
    
    // Sort by strongest match
    tk.sort((a,b) => {
        const aCtx = a.context_match === true || String(a.context_match).toLowerCase() === "true";
        const aTrn = a.transition_match === true || String(a.transition_match).toLowerCase() === "true";
        const bCtx = b.context_match === true || String(b.context_match).toLowerCase() === "true";
        const bTrn = b.transition_match === true || String(b.transition_match).toLowerCase() === "true";
        
        const aS = (aCtx ? 1 : 0) + (aTrn ? 1 : 0);
        const bS = (bCtx ? 1 : 0) + (bTrn ? 1 : 0);
        return bS - aS;
    });

    const cont = document.getElementById('v4-recovery-container');
    if (!cont) return;

    let html = '';
    tk.forEach(r => {
        const sym = r.ticker.split('.')[0];
        const ctx = r.context_match === true || String(r.context_match).toLowerCase() === "true";
        const trn = r.transition_match === true || String(r.transition_match).toLowerCase() === "true";
        
        const recStr = trn ? 'STRONG' : 'BUILDING';
        const recCol = trn ? 'var(--color-risk-on)' : 'var(--color-netral)';
        
        const prob = (ctx && trn) ? '78%' : '55%';
        const probCol = (ctx && trn) ? 'var(--color-risk-on)' : 'var(--color-netral)';
        
        const vol = trn ? 'CONFIRMED' : 'PENDING';
        
        html += `
            <div class="card opp-card">
                <div class="opp-header">
                    <div>
                        <div class="opp-ticker">${sym}</div>
                        <div class="text-xs text-secondary mt-1">Updated: ${r.last_update || MKT.last_update || '--'}</div>
                    </div>
                    <div class="opp-score" style="color:${probCol}; font-size:1.5rem;">${prob}</div>
                </div>
                <div style="font-size:0.875rem; display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="text-secondary">Recovery Strength</span>
                        <span class="font-bold" style="color:${recCol}">${recStr}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span class="text-secondary">Context Match</span>
                        <span class="font-bold" style="color:${ctx ? 'var(--color-risk-on)' : 'var(--color-risk-off)'}">${ctx ? 'YES' : 'NO'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span class="text-secondary">Volume Conf.</span>
                        <span class="font-bold" style="color:${trn ? 'var(--color-risk-on)' : 'var(--text-secondary)'}">${vol}</span>
                    </div>
                </div>
            </div>`;
    });
    
    cont.innerHTML = html;
}

// Phase 5: Exit / Capital Protection Rendering
function renderExit() {
    console.log("Rendering Exit Tab...");
    if (typeof EX === 'undefined' || !EX.length) return;

    // Filter exit candidates
    const exits = EX.filter(r => r.exit_state && r.exit_state !== 'HEALTHY');
    
    const cont = document.getElementById('v4-exit-container');
    const briefEl = document.getElementById('v4-exit-brief');
    const riskEl = document.getElementById('v4-exit-market-risk');

    if (riskEl && typeof RS !== 'undefined') {
        const rc = getStatusColorClass(RS.status);
        riskEl.innerHTML = `<span class="badge bg-${rc}">${RS.status}</span>`;
    }

    if (briefEl) {
        let msg = `Market is currently in <strong>${typeof RS !== 'undefined' ? RS.status : 'UNKNOWN'}</strong> state. `;
        if (exits.length > 5) msg += `High sell pressure detected with ${exits.length} open exit signals. Capital protection should be prioritized.`;
        else if (exits.length > 0) msg += `Moderate rotation. Found ${exits.length} stocks triggering exit or weakening rules. Review candidates below.`;
        else msg += `No immediate broad exit signals detected in the portfolio.`;
        briefEl.innerHTML = msg;
    }

    if (!cont) return;

    let html = '';
    exits.forEach(r => {
        const sym = r.ticker.split('.')[0];
        const stateColor = r.exit_state.includes('RISK') || r.exit_state === 'EXIT' ? 'var(--color-risk-off)' : 'var(--color-netral)';
        
        // Sell Pressure proxy based on rules
        const rules = r.triggered_rules ? r.triggered_rules.split(',').length : 1;
        const pressure = rules > 1 ? 'HIGH' : 'MEDIUM';
        
        const dd = r.drawdown_from_entry ? Number(r.drawdown_from_entry).toFixed(1) : '0.0';

        html += `
            <div class="card opp-card" style="border-left: 3px solid ${stateColor};">
                <div class="opp-header">
                    <div>
                        <div class="opp-ticker">${sym}</div>
                        <div class="text-xs font-bold" style="color:${stateColor}; margin-top:0.25rem;">${r.exit_state}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-xs text-secondary">Drawdown</div>
                        <div class="opp-score" style="color:var(--color-risk-off); font-size:1.25rem;">${dd}%</div>
                    </div>
                </div>
                <div style="font-size:0.875rem; display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem; border-top:1px solid var(--border-color); padding-top:0.5rem;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="text-secondary">Sell Pressure</span>
                        <span class="font-bold" style="color:${pressure==='HIGH'?'var(--color-risk-off)':'var(--color-netral)'}">${pressure}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span class="text-secondary">Triggered Rules</span>
                        <span class="font-bold">${r.triggered_rules || '--'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span class="text-secondary">Rank Change</span>
                        <span class="font-bold" style="color:${r.rank_change<0?'var(--color-risk-off)':'var(--text-secondary)'}">${r.rank_change || '0'}</span>
                    </div>
                </div>
            </div>`;
    });
    
    cont.innerHTML = html;
}

// Phase 4: Simulation Rendering
let simChartInstance = null;

function calcStats(vals, rets) {
    if (vals.length < 2) return { totalReturn:0, cagr:0, sharpe:0, maxDD:0, winRate:0 };
    var tr = (vals[vals.length-1]/vals[0]-1)*100;
    var yr = (vals.length-1)/12;
    var cagr = yr > 0 ? (Math.pow(vals[vals.length-1]/vals[0], 1/yr)-1)*100 : 0;
    var mr = rets.reduce((a,b) => a+b, 0)/rets.length;
    var sd = Math.sqrt(rets.reduce((a,b) => a+Math.pow(b-mr,2), 0)/rets.length);
    var sharpe = sd > 0 ? (mr/sd)*Math.sqrt(12) : 0;
    var pk = vals[0], mdd = 0;
    for (var i = 1; i < vals.length; i++) { if (vals[i] > pk) pk = vals[i]; var d = (vals[i]/pk-1)*100; if (d < mdd) mdd = d; }
    var wc = rets.filter(r => r>0).length;
    return { totalReturn: tr, cagr: cagr, sharpe: sharpe, maxDD: mdd, winRate: (wc/rets.length)*100 };
}

function renderSimulation() {
    console.log("Rendering Simulation Tab...");
    if (typeof BM === 'undefined' || !BM.length) return;

    // Build BM_M locally if needed
    var labels = [], cb = [], cf = [], ih = [], rb=[], rf=[], ri=[];
    for (var i = 0; i < BM.length; i++) {
        labels.push(BM[i].date);
        cb.push(BM[i].config_b);
        cf.push(BM[i].config_f);
        ih.push(BM[i].ihsg);
        
        var pb = i > 0 ? BM[i-1].config_b : BM[i].config_b;
        var pf2 = i > 0 ? BM[i-1].config_f : BM[i].config_f;
        var pi = i > 0 ? BM[i-1].ihsg : BM[i].ihsg;
        
        rb.push((BM[i].config_b/pb-1)*100);
        rf.push((BM[i].config_f/pf2-1)*100);
        ri.push((BM[i].ihsg/pi-1)*100);
    }
    
    const sF = calcStats(cf, rf);
    const sB = calcStats(cb, rb);
    const sI = calcStats(ih, ri);

    // Determine Winner
    const winner = sF.cagr > sB.cagr ? 'Config F' : 'Config B';
    const winEl = document.getElementById('v4-sim-winner');
    if (winEl) winEl.textContent = winner;

    // Metrics Cards
    const metricsEl = document.getElementById('v4-sim-metrics');
    if (metricsEl) {
        const makeCard = (title, valF, valB, valI, suffix='') => `
            <div class="card" style="margin-bottom:0;">
                <div class="card-title">${title}</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                    <span style="color:#3B82F6" class="font-bold">F: ${valF.toFixed(1)}${suffix}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.875rem;">
                    <span style="color:#8B5CF6">B: ${valB.toFixed(1)}${suffix}</span>
                    <span style="color:var(--text-secondary)">IHSG: ${valI.toFixed(1)}${suffix}</span>
                </div>
            </div>
        `;
        
        metricsEl.innerHTML = 
            makeCard('Total Return', sF.totalReturn, sB.totalReturn, sI.totalReturn, '%') +
            makeCard('CAGR', sF.cagr, sB.cagr, sI.cagr, '%') +
            makeCard('Max Drawdown', sF.maxDD, sB.maxDD, sI.maxDD, '%') +
            makeCard('Win Rate', sF.winRate, sB.winRate, sI.winRate, '%');
    }

    // Drawdown Profile
    const ddEl = document.getElementById('v4-sim-dd-profile');
    if (ddEl) {
        ddEl.innerHTML = `
            <div style="font-size:0.875rem; color:var(--text-secondary);">
                <div style="margin-bottom:0.5rem; display:flex; justify-content:space-between;"><span>Config F Max DD:</span> <span style="color:var(--color-risk-off)">${sF.maxDD.toFixed(1)}%</span></div>
                <div style="margin-bottom:0.5rem; display:flex; justify-content:space-between;"><span>Config B Max DD:</span> <span style="color:var(--color-risk-off)">${sB.maxDD.toFixed(1)}%</span></div>
                <div style="display:flex; justify-content:space-between;"><span>IHSG Max DD:</span> <span style="color:var(--color-risk-off)">${sI.maxDD.toFixed(1)}%</span></div>
            </div>
        `;
    }

    // Alpha Analysis
    const alphaEl = document.getElementById('v4-sim-alpha');
    if (alphaEl) {
        const alphaF = sF.cagr - sI.cagr;
        const alphaB = sB.cagr - sI.cagr;
        alphaEl.innerHTML = `
            <div style="font-size:0.875rem; color:var(--text-secondary);">
                <div style="margin-bottom:0.5rem; display:flex; justify-content:space-between;"><span>Config F Alpha vs IHSG:</span> <span style="color:var(--color-risk-on)">+${alphaF.toFixed(1)}%</span></div>
                <div style="margin-bottom:0.5rem; display:flex; justify-content:space-between;"><span>Config B Alpha vs IHSG:</span> <span style="color:var(--color-risk-on)">+${alphaB.toFixed(1)}%</span></div>
                <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid var(--border-color); font-style:italic;">
                    ${alphaF > 0 && alphaB > 0 ? "Kedua strategi berhasil mengalahkan IHSG. Alpha positif." : "Salah satu atau kedua strategi gagal mengalahkan IHSG."}
                </div>
            </div>
        `;
    }

    // Chart.js
    const ctx = document.getElementById('v4-sim-chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (simChartInstance) simChartInstance.destroy();
        
        Chart.defaults.color = '#9CA3AF';
        Chart.defaults.font.family = 'Inter';
        
        simChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Config F', data: cf, borderColor: '#3B82F6', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: 'Config B', data: cb, borderColor: '#8B5CF6', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: 'IHSG', data: ih, borderColor: '#9CA3AF', borderWidth: 1, borderDash: [5,5], pointRadius: 0, tension: 0.1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleColor: '#FFFFFF',
                        bodyColor: '#9CA3AF',
                        borderColor: '#1F2937',
                        borderWidth: 1
                    },
                    zoom: {
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
                        pan: { enabled: true, mode: 'x' }
                    }
                },
                scales: {
                    x: { grid: { color: '#1F2937' }, ticks: { maxTicksLimit: 12 } },
                    y: { type: 'logarithmic', grid: { color: '#1F2937' } }
                }
            }
        });
    }
}

// Intelligence Panel Rendering
function renderIntelligencePanel() {
    const pEl = document.getElementById('v4-intelligence-panel');
    if (!pEl) return;
    
    if (typeof RS === 'undefined' || typeof L === 'undefined') return;
    
    // Top Stock
    const w = activeConfig === 'prod' ? CW_F : CW_B;
    let topStock = '--';
    if (L && L.length > 0 && typeof computeFinalScore === 'function') {
        const scored = L.map(r => ({ ...r, _score: computeFinalScore(r, w) })).sort((a,b) => b._score - a._score);
        if (scored.length > 0) topStock = scored[0].ticker.split('.')[0] + ' (' + scored[0]._score.toFixed(1) + ')';
    } else if (L && L.length > 0) {
        topStock = L[0].ticker.split('.')[0];
    }
    
    const rc = RS.radar_context || {};
    
    let html = `
        <div class="card" style="padding:1rem;">
            <div class="text-xs text-secondary">Top Stock Today</div>
            <div class="text-primary font-bold" style="font-size:1.25rem; margin-top:0.25rem;">${topStock}</div>
        </div>
        <div class="card" style="padding:1rem;">
            <div class="text-xs text-secondary">Strongest Factor</div>
            <div class="text-primary font-bold" style="font-size:1.25rem; margin-top:0.25rem; color:var(--color-risk-on)">${rc.strongest_factor || '--'}</div>
        </div>
        <div class="card" style="padding:1rem;">
            <div class="text-xs text-secondary">Weakest Factor</div>
            <div class="text-primary font-bold" style="font-size:1.25rem; margin-top:0.25rem; color:var(--color-risk-off)">${rc.weakest_factor || '--'}</div>
        </div>
        <div class="card" style="padding:1rem;">
            <div class="text-xs text-secondary">Capital Deployment</div>
            <div class="text-primary font-bold" style="font-size:1.25rem; margin-top:0.25rem;">${RS.capital_deployment !== undefined ? RS.capital_deployment + '%' : '--'}</div>
        </div>
    `;
    pEl.innerHTML = html;
}

// Boot
loadData();

// --- Bottom Sheet Logic ---
let bsCurrentTicker = '';

function openBottomSheet(ticker) {
    bsCurrentTicker = ticker;
    document.getElementById('bs-ticker').textContent = ticker;
    
    // Get PF data
    const pfData = (typeof PF !== 'undefined' && PF[ticker]) ? PF[ticker] : {};
    document.getElementById('bs-name').textContent = pfData.name || '--';
    document.getElementById('bs-sector').textContent = pfData.sector || '--';
    document.getElementById('bs-industry').textContent = pfData.industry || '--';
    document.getElementById('bs-summary').textContent = pfData.summary || '--';
    
    // Get L data
    const lData = (typeof L !== 'undefined') ? L.find(r => r.ticker.split('.')[0] === ticker) || {} : {};
    const score = Number(lData.final_score || 0);
    document.getElementById('bs-rank').textContent = lData.rank ? `#${lData.rank}` : '--';
    document.getElementById('bs-score').textContent = score ? score.toFixed(1) : '--';
    
    // Conviction
    const rank = Number(lData.rank || 0);
    const gap = lData.score_gap_to_next ? Number(lData.score_gap_to_next) : 2;
    const conv = getConviction(score, rank, gap);
    const convEl = document.getElementById('bs-conviction');
    if (convEl) {
        convEl.innerHTML = `<span class="${conv.class}">${conv.text}</span>`;
    }

    // Market Cap
    const fdTickerKey = ticker.includes('.') ? ticker : ticker + '.JK';
    const fdData = (typeof FD !== 'undefined' && FD[fdTickerKey]) ? FD[fdTickerKey] : {};
    document.getElementById('bs-mcap').textContent = fdData.market_cap ? `Rp ${(fdData.market_cap/1e12).toFixed(1)} T` : '--';
    
    // Factor bars
    const setBar = (id, val) => {
        document.getElementById(`bs-f-${id}-val`).textContent = val ? Number(val).toFixed(1) : '--';
        const el = document.getElementById(`bs-f-${id}`);
        if(el) {
            el.style.width = val ? `${val}%` : '0%';
            el.style.backgroundColor = `var(--color-${val>=60?'risk-on':val>=40?'netral':'risk-off'})`;
        }
    };
    setBar('q', lData.quality);
    setBar('g', lData.growth);
    setBar('v', lData.value);
    setBar('m', lData.momentum);

    // Factor explanation
    const factors = [
        {name:'Quality', val:Number(lData.quality||0)},
        {name:'Growth', val:Number(lData.growth||0)},
        {name:'Value', val:Number(lData.value||0)},
        {name:'Momentum', val:Number(lData.momentum||0)}
    ];
    const sorted = [...factors].sort((a,b)=>b.val-a.val);
    const strong = sorted[0], weak = sorted[3];
    const fEl = document.getElementById('bs-factors-text');
    if (fEl && score) {
        let expl = `Strongest: ${strong.name} (${strong.val.toFixed(1)}). Weakest: ${weak.name} (${weak.val.toFixed(1)}). `;
        if (strong.val > 70 && weak.val > 50) expl += `All factors above threshold — balanced profile.`;
        else if (strong.val > 70) expl += `${strong.name} is dominant but ${weak.name} needs monitoring.`;
        else expl += `Moderate factor scores — no extreme concentration.`;
        fEl.textContent = expl;
    } else if (fEl) {
        fEl.textContent = 'No factor data available.';
    }

    // AI Insight
    if (lData.rank) {
        const convIndo = { HIGH: 'TINGGI', MEDIUM: 'SEDANG', LOW: 'RENDAH' };
        const factorIndo = { Quality: 'Quality', Growth: 'Growth', Value: 'Value', Momentum: 'Momentum' };
        document.getElementById('bs-ai-insight').textContent = `${ticker} peringkat #${lData.rank} dengan skor ${score.toFixed(1)}. Faktor terkuat: ${sorted[0].name} (${sorted[0].val.toFixed(1)}). Keyakinan sistem: ${convIndo[conv.text] || conv.text}.`;
    } else {
        document.getElementById('bs-ai-insight').textContent = "Data peringkat tidak tersedia.";
    }
    
    // Show sheet
    document.getElementById('v4-bottom-sheet').classList.add('open');
    document.getElementById('bs-overlay').classList.add('open');
    
    // Reset to overview tab
    switchBsTab('overview');
}

function closeBottomSheet() {
    const sheet = document.getElementById('v4-bottom-sheet');
    const overlay = document.getElementById('bs-overlay');
    if(sheet) sheet.classList.remove('open');
    if(overlay) overlay.classList.remove('open');
}

function switchBsTab(tab) {
    document.querySelectorAll('.bs-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bs-tab-content').forEach(c => c.classList.remove('active'));
    
    const btn = document.querySelector(`.bs-tab-btn[onclick="switchBsTab('${tab}')"]`);
    if(btn) btn.classList.add('active');
    
    const content = document.getElementById(`bs-tab-${tab}`);
    if(content) content.classList.add('active');
}

function openExternal(site) {
    if(!bsCurrentTicker) return;
    const t = bsCurrentTicker;
    if(site === 'tv') window.open(`https://www.tradingview.com/chart/?symbol=IDX:${t}`, '_blank');
    if(site === 'gf') window.open(`https://www.google.com/finance/quote/${t}:IDX`, '_blank');
    if(site === 'yf') window.open(`https://finance.yahoo.com/quote/${t}.JK`, '_blank');
}

// Close on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBottomSheet();
});

// --- Drag-to-Dismiss for Bottom Sheet (Mobile) ---
(function() {
    const sheet = document.getElementById('v4-bottom-sheet');
    if (!sheet) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let dragHistory = [];
    const threshold = 120;
    const DRAG_HANDLE_SELECTOR = '.bs-handle, .bs-header';

    function isMobile() {
        return window.innerWidth <= 1024;
    }

    function getTranslateY(el) {
        const match = el.style.transform.match(/translateY\(([-\d.]+)px\)/);
        return match ? parseFloat(match[1]) : 0;
    }

    function onTouchStart(e) {
        if (!isMobile() || !sheet.classList.contains('open')) return;
        const target = e.target.closest(DRAG_HANDLE_SELECTOR);
        if (!target) return;

        isDragging = true;
        startY = e.touches[0].clientY;
        currentY = startY;
        dragHistory = [{ y: startY, t: performance.now() }];
        sheet.classList.add('dragging');
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const delta = currentY - startY;
        if (delta < 0) return;

        dragHistory.push({ y: currentY, t: performance.now() });
        if (dragHistory.length > 10) dragHistory.shift();

        sheet.style.transform = `translateY(${delta}px)`;

        const overlay = document.getElementById('bs-overlay');
        if (overlay) {
            const opacity = Math.max(0, 1 - delta / 500);
            const scale = Math.max(0.95, 1 - delta / 2000);
            overlay.style.opacity = opacity;
            overlay.style.transform = `scale(${scale})`;
        }
    }

    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        sheet.classList.remove('dragging');

        const delta = currentY - startY;

        let velocity = 0;
        if (dragHistory.length >= 2) {
            const first = dragHistory[0];
            const last = dragHistory[dragHistory.length - 1];
            const dt = (last.t - first.t) || 1;
            velocity = (last.y - first.y) / dt * 1000;
        }

        const overlay = document.getElementById('bs-overlay');
        if (delta > threshold || velocity > 800) {
            sheet.style.transform = `translateY(100%)`;
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(0.95)';
            }
            setTimeout(() => {
                closeBottomSheet();
                sheet.style.transform = '';
                if (overlay) {
                    overlay.style.opacity = '';
                    overlay.style.transform = '';
                }
            }, 250);
        } else {
            sheet.style.transform = 'translateY(0)';
            if (overlay) {
                overlay.style.opacity = '1';
                overlay.style.transform = 'scale(1)';
            }
        }
    }

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: true });
    sheet.addEventListener('touchend', onTouchEnd, { passive: true });
})();
