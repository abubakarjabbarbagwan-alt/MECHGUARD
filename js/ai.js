/* MECHGUARD — AI module handles insight generation, status rules, and prediction summaries */

function setAIConnection(connected) {
  _aiConnected = connected;
  const badge = document.getElementById('aiConnBadge');
  const txt = document.getElementById('aiConnText');
  const blink = document.getElementById('aiBlink');
  if (!badge || !txt) return;
  if (connected) {
    badge.className = 'ai-conn-badge connected';
    txt.textContent = 'LIVE DATA CONNECTED';
    if (blink) {
      blink.style.background = '#22d87a';
      blink.style.boxShadow = '0 0 8px #22d87a';
    }
  } else {
    badge.className = 'ai-conn-badge disconnected';
    txt.textContent = 'WAITING FOR SENSOR DATA';
    if (blink) {
      blink.style.background = '#9b6dff';
      blink.style.boxShadow = '';
    }
  }
}

function getTrend(current, previous, invertGood) {
  if (previous === null) return { txt: '→ Stable', cls: 'trend-stab' };
  const delta = current - previous;
  const threshold = Math.abs(previous) * 0.02 || 0.05;
  if (Math.abs(delta) < threshold) return { txt: '→ Stable', cls: 'trend-stab' };
  if (delta > 0) return { txt: '↑ Rising', cls: 'trend-up' };
  return { txt: '↓ Dropping', cls: 'trend-down' };
}

function getTempStatusLevel(temp) {
  if (temp > 70) return 'critical';
  if (temp > 50) return 'high';
  if (temp > 35) return 'medium';
  return 'normal';
}

function getVibStatusLevel(vibRate) {
  if (vibRate > 5) return 'high';
  if (vibRate > 2) return 'medium';
  return 'normal';
}

function getVoltStatusLevel(health, efficiency) {
  const avg = (health + efficiency) / 2;
  if (avg < 40) return 'critical';
  if (avg < 65) return 'high';
  return 'normal';
}

function applyLiveCardStatus(cardId, valueId, statusId, trendId, value, unit, statusLevel, trend, labels) {
  const card = document.getElementById(cardId);
  const val = document.getElementById(valueId);
  const status = document.getElementById(statusId);
  const trendLabel = document.getElementById(trendId);
  if (!card || !val || !status || !trendLabel) return;
  const statusClass = {
    normal: 's-normal',
    medium: 's-medium',
    high: 's-high',
    critical: 's-critical'
  }[statusLevel] || 's-normal';
  const colorClass = {
    normal: 'c-normal',
    medium: 'c-medium',
    high: 'c-high',
    critical: 'c-critical'
  }[statusLevel] || 'c-normal';
  card.className = 'ai-live-card ' + statusClass;
  val.className = 'ai-live-val ' + colorClass;
  val.textContent = value + (unit ? ' ' + unit : '');
  status.className = 'ai-live-status ' + colorClass;
  status.textContent = labels[statusLevel] || statusLevel.toUpperCase();
  trendLabel.className = 'ai-live-trend ' + trend.cls;
  trendLabel.textContent = trend.txt;
}

function flashCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.remove('status-flash');
  void card.offsetWidth;
  card.classList.add('status-flash');
  setTimeout(() => card.classList.remove('status-flash'), 700);
}

function updatePanelGlow(level) {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;
  panel.className = 'ai-panel status-' + level;
}

function updateAIMetrics(temp, vibCount, vibRate, currentAmps, powerKw, health, efficiency, machineStatus) {
  lastSensorSnapshot = { temp, vibCount, vibRate, currentAmps, powerKw, health, efficiency, machineStatus };
  setAIConnection(true);
  const tempTrend = getTrend(temp, _prevTemp, false);
  const vibTrend = getTrend(vibRate, _prevVibR, false);
  const effTrend = getTrend(efficiency, _prevEff, true);
  const tempLevel = getTempStatusLevel(temp);
  const vibLevel = getVibStatusLevel(vibRate);
  const voltLevel = getVoltStatusLevel(health, efficiency);
  applyLiveCardStatus('aiLiveTempCard', 'aiLiveTempVal', 'aiLiveTempStatus', 'aiLiveTempTrend', temp.toFixed(1), '°C', tempLevel, tempTrend, {
    normal: 'NORMAL', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL'
  });
  applyLiveCardStatus('aiLiveVibCard', 'aiLiveVibVal', 'aiLiveVibStatus', 'aiLiveVibTrend', vibRate.toFixed(2), '/s', vibLevel, vibTrend, {
    normal: 'NORMAL', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL'
  });
  applyLiveCardStatus('aiLiveVoltCard', 'aiLiveVoltVal', 'aiLiveVoltStatus', 'aiLiveVoltTrend', efficiency.toFixed(0) + '% / ' + health.toFixed(0) + '%', '', voltLevel, effTrend, {
    normal: 'STABLE', medium: 'FLUCTUATING', high: 'DANGER', critical: 'CRITICAL'
  });
  _prevTemp = temp;
  _prevVibR = vibRate;
  _prevEff = efficiency;

  let score = 0;
  const tempScore = temp > 60 ? 1 : temp > 50 ? 0.5 : temp > 40 ? 0.2 : 0;
  const vibScore = vibRate > 5 ? 1 : vibRate > 2 ? 0.5 : vibRate > 0.5 ? 0.15 : 0;
  const currentScore = powerKw > 5 ? 0.8 : powerKw > 3 ? 0.4 : currentAmps > 90 ? 0.3 : 0;
  const effScore = efficiency < 40 ? 1 : efficiency < 60 ? 0.5 : efficiency < 75 ? 0.2 : 0;
  score = Math.min(1, tempScore * 0.30 + vibScore * 0.35 + currentScore * 0.20 + effScore * 0.15);
  const anomalyPct = Math.round(score * 100);

  const anomalyValue = document.getElementById('aiAnomalyScore');
  const anomalyLabel = document.getElementById('aiAnomalyLabel');
  const anomalyBar = document.getElementById('aiAnomalyBar');
  if (anomalyValue) anomalyValue.textContent = score.toFixed(2);
  if (score >= 0.6) {
    if (anomalyValue) anomalyValue.className = 'ai-metric-val ai-status-critical';
    if (anomalyBar) { anomalyBar.className = 'ai-metric-bar-fill ai-bar-critical'; anomalyBar.style.width = anomalyPct + '%'; }
    if (anomalyLabel) anomalyLabel.textContent = 'Critical anomaly!';
  } else if (score >= 0.3) {
    if (anomalyValue) anomalyValue.className = 'ai-metric-val ai-status-warning';
    if (anomalyBar) { anomalyBar.className = 'ai-metric-bar-fill ai-bar-warning'; anomalyBar.style.width = anomalyPct + '%'; }
    if (anomalyLabel) anomalyLabel.textContent = 'Warning-level anomaly';
  } else {
    if (anomalyValue) anomalyValue.className = 'ai-metric-val ai-status-normal';
    if (anomalyBar) { anomalyBar.className = 'ai-metric-bar-fill ai-bar-normal'; anomalyBar.style.width = Math.max(5, anomalyPct) + '%'; }
    if (anomalyLabel) anomalyLabel.textContent = 'No anomalies';
  }

  let aiStatus;
  let aiConf;
  let statusClass;
  let barClass;
  let panelLevel;
  if (score >= 0.6 || temp > 60) {
    aiStatus = 'CRITICAL';
    aiConf = Math.round(75 + score * 20) + '%';
    statusClass = 'ai-status-critical';
    barClass = 'ai-bar-critical';
    panelLevel = 'critical';
  } else if (score >= 0.25 || temp > 50 || vibRate > 2) {
    aiStatus = 'WARNING';
    aiConf = Math.round(65 + score * 25) + '%';
    statusClass = 'ai-status-warning';
    barClass = 'ai-bar-warning';
    panelLevel = 'high';
  } else if (score >= 0.1 || temp > 35) {
    aiStatus = 'MEDIUM';
    aiConf = Math.round(80 + (1 - score) * 10) + '%';
    statusClass = 'ai-status-warning';
    barClass = 'ai-bar-warning';
    panelLevel = 'medium';
  } else {
    aiStatus = 'NORMAL';
    aiConf = Math.round(85 + (1 - score) * 12) + '%';
    statusClass = 'ai-status-normal';
    barClass = 'ai-bar-normal';
    panelLevel = 'normal';
  }

  const aiStatusValue = document.getElementById('aiStatusVal');
  if (aiStatusValue) {
    aiStatusValue.textContent = aiStatus;
    aiStatusValue.className = 'ai-metric-val ' + statusClass;
  }
  MG.setText('aiConfidence', 'Confidence: ' + aiConf);
  const aiConfBar = document.getElementById('aiConfBar');
  if (aiConfBar) { aiConfBar.className = 'ai-metric-bar-fill ' + barClass; aiConfBar.style.width = aiConf; }
  updatePanelGlow(panelLevel);

  const riskValue = document.getElementById('aiRiskVal');
  const riskBar = document.getElementById('aiRiskBar');
  let riskText;
  let riskPct;
  let riskColor;
  if (score >= 0.6) { riskText = 'HIGH'; riskPct = 80; riskColor = '#f03e3e'; }
  else if (score >= 0.3) { riskText = 'MEDIUM'; riskPct = 50; riskColor = '#ffb84d'; }
  else { riskText = 'LOW'; riskPct = 15; riskColor = '#9b6dff'; }
  if (riskValue) { riskValue.textContent = riskText; riskValue.style.color = riskColor; }
  if (riskBar) riskBar.style.width = riskPct + '%';

  const ttfValue = document.getElementById('aiTTFVal');
  let ttfLabel;
  let ttfColor;
  if (score >= 0.7) { ttfLabel = '< 2 hrs'; ttfColor = '#f03e3e'; }
  else if (score >= 0.3) { ttfLabel = '1–3 days'; ttfColor = '#ffb84d'; }
  else { ttfLabel = '> 30 days'; ttfColor = '#22d87a'; }
  if (ttfValue) { ttfValue.textContent = ttfLabel; ttfValue.style.color = ttfColor; }

  const recommendations = [];
  if (temp > 70) recommendations.push({ icon: '🚨', txt: 'EMERGENCY: Temperature CRITICAL — shut down immediately!' });
  else if (temp > 50) recommendations.push({ icon: '🔥', txt: `HIGH TEMP: ${temp.toFixed(1)}°C — check cooling system.` });
  if (vibRate > 5) recommendations.push({ icon: '📳', txt: 'CRITICAL vibration — inspect bearings and mountings now.' });
  else if (vibRate > 2) recommendations.push({ icon: '⚠️', txt: `Vibration elevated at ${vibRate.toFixed(2)}/s — monitor closely.` });
  if (efficiency < 60) recommendations.push({ icon: '📉', txt: `Efficiency low (${efficiency.toFixed(0)}%) — inspect drive system.` });
  if (!recommendations.length) {
    recommendations.push({ icon: '✅', txt: 'All parameters within normal operating range.' });
    recommendations.push({ icon: '📅', txt: 'Continue scheduled maintenance as planned.' });
  }
  const recList = document.getElementById('aiRecList');
  if (recList) {
    recList.innerHTML = recommendations.map(r => `<div class="ai-rec-item"><span class="ai-rec-icon">${r.icon}</span>${r.txt}</div>`).join('');
  }

  MG.setText('aiPredictMaint', `Next Maintenance: <span class="predict-highlight">${score < 0.1 ? '~30 days' : score < 0.3 ? '~14 days' : '~7 days'}</span>`);
  if (document.getElementById('aiPredictFailure')) {
    document.getElementById('aiPredictFailure').innerHTML = `Failure Probability: <span class="predict-highlight" style="color:${score >= 0.5 ? '#f03e3e' : '#9b6dff'}">${Math.round(score * 100)}%</span>`;
  }
  if (document.getElementById('aiPredictEff')) {
    document.getElementById('aiPredictEff').innerHTML = `Efficiency Trend: <span class="predict-highlight" style="color:${efficiency > 80 ? '#22d87a' : efficiency > 65 ? '#ffb84d' : '#f03e3e'}">${efficiency > 80 ? '↗ Improving' : efficiency > 65 ? '→ Stable' : '↘ Declining'}</span>`;
  }
  const autoAction = score >= 0.6 ? '⚠ AUTO-SHUTDOWN' : score >= 0.3 ? '⚡ ALERT MODE' : '✅ MONITORING';
  const autoActionEl = document.getElementById('aiAutoAction');
  if (autoActionEl) {
    autoActionEl.textContent = autoAction;
    autoActionEl.style.color = score >= 0.6 ? '#f03e3e' : score >= 0.3 ? '#ffb84d' : '#00d4ff';
  }

  const thinkingBadge = document.getElementById('aiThinkingBadge');
  if (thinkingBadge) {
    thinkingBadge.textContent = aiStatus;
    thinkingBadge.style.color = score >= 0.6 ? '#f03e3e' : score >= 0.3 ? '#ffb84d' : '#22d87a';
    thinkingBadge.style.background = score >= 0.6 ? 'rgba(240,62,62,0.12)' : score >= 0.3 ? 'rgba(255,184,77,0.1)' : 'rgba(34,216,122,0.1)';
    thinkingBadge.style.borderColor = score >= 0.6 ? 'rgba(240,62,62,0.35)' : score >= 0.3 ? 'rgba(255,184,77,0.25)' : 'rgba(34,216,122,0.25)';
  }
}

async function runAIAnalysis() {
  const button = document.getElementById('btnAIAnalyze');
  const insight = document.getElementById('aiInsightContent');
  if (!lastSensorSnapshot) {
    if (insight) insight.innerHTML = '<div class="ai-insight-loading"><div class="ai-dots"><span></span><span></span><span></span></div>No sensor data yet.</div>';
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = '⏳ ANALYZING...';
  }
  if (insight) insight.innerHTML = '<div class="ai-insight-loading"><div class="ai-dots"><span></span><span></span><span></span></div>Analyzing sensor triggers...</div>';

  const s = lastSensorSnapshot;
  const message = `Machine report: Temp=${s.temp.toFixed(1)}°C, VibRate=${s.vibRate.toFixed(2)} /s, Current=${s.currentAmps}, Power=${s.powerKw.toFixed(2)} /s, Health=${s.health.toFixed(0)}%, Efficiency=${s.efficiency.toFixed(0)}%.`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: message }]
      })
    });
    const data = await response.json();
    const text = (data.content || []).filter(Boolean).map(chunk => chunk.text || '').join('') || 'AI analysis complete.';
    if (insight) insight.innerHTML = `<div class="ai-insight-text">${text}</div>`;
  } catch (error) {
    if (insight) insight.innerHTML = `<div class="ai-insight-text">${message} Analysis fallback: monitor temperature and vibration, verify cooling and mount stability.</div>`;
  }
  if (button) { button.disabled = false; button.textContent = '⚡ RUN AI ANALYSIS'; }
}
