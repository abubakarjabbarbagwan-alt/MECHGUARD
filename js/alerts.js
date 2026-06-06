/* MECHGUARD — Alert system, sound engine, and threshold controls */
let soundEnabled = true;
let audioCtx = null;
let masterVolume = 0.80;
let repeatInterval = 3000;
let soundWave = 'harsh';
const alertTypeEnabled = { temp: true, vib: true };
let alertSoundTimers = { temp: null, vib: null };
let alertBadgeTimer = null;
const thresholds = { temp: 50, vib: 5 };

function getAudioCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function getMasterChain(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const gain = ctx.createGain();
  gain.gain.value = Math.min(1.5, masterVolume * 1.5);
  comp.connect(gain);
  gain.connect(ctx.destination);
  return comp;
}

function makeDistCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i += 1) {
    const x = i * 2 / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function playHarsh(ctx, type, now) {
  const chain = getMasterChain(ctx);
  const configs = {
    temp: [
      { type: 'sawtooth', freqs: [960, 720, 960, 720, 960], times: [0, 0.12, 0.24, 0.36, 0.48], gain: 0.9, dur: 0.7 },
      { type: 'sine', freqs: [120, 80], times: [0, 0.15], gain: 0.5, dur: 0.3 },
      { type: 'sawtooth', freqs: [1400, 1100], times: [0, 0.2], gain: 0.4, dur: 0.5 },
    ],
    vib: [
      { type: 'square', freqs: [180, 140, 180, 140], times: [0, 0.15, 0.3, 0.45], gain: 0.9, dur: 0.7 },
      { type: 'sawtooth', freqs: [360, 280], times: [0, 0.2], gain: 0.5, dur: 0.5 },
      { type: 'sine', freqs: [80, 60], times: [0, 0.25], gain: 0.4, dur: 0.4 },
    ],
  };
  (configs[type] || configs.temp).forEach(layer => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistCurve(220);
    shaper.oversample = '4x';
    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(chain);
    osc.type = layer.type;
    layer.freqs.forEach((freq, idx) => osc.frequency.setValueAtTime(freq, now + (layer.times[idx] || 0)));
    gain.gain.setValueAtTime(layer.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + layer.dur);
    osc.start(now);
    osc.stop(now + layer.dur + 0.05);
  });
}

function playClassic(ctx, type, now) {
  const chain = getMasterChain(ctx);
  const map = {
    temp: [{ f: 880, t: 0 }, { f: 660, t: 0.15 }, { f: 880, t: 0.3 }, { f: 660, t: 0.45 }],
    vib: [{ f: 440, t: 0 }, { f: 330, t: 0.18 }, { f: 440, t: 0.36 }],
  };
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(chain);
  osc.type = 'sine';
  (map[type] || map.temp).forEach(step => osc.frequency.setValueAtTime(step.f, now + step.t));
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
  osc.start(now);
  osc.stop(now + 0.8);
}

function playBeep(ctx, type, now) {
  const chain = getMasterChain(ctx);
  const pitches = { temp: [1200, 1200, 1200], vib: [600, 600, 600] };
  const list = pitches[type] || pitches.temp;
  list.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(chain);
    osc.type = 'square';
    osc.frequency.value = freq;
    const startTime = now + index * 0.22;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(0.001, startTime + 0.18);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  });
}

function playSiren(ctx, type, now) {
  const chain = getMasterChain(ctx);
  const map = { temp: [600, 1200], vib: [200, 500] };
  const [low, high] = map[type] || map.temp;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(chain);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(low, now);
  osc.frequency.linearRampToValueAtTime(high, now + 0.4);
  osc.frequency.linearRampToValueAtTime(low, now + 0.8);
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.start(now);
  osc.stop(now + 0.95);
}

function animateWavePreview(type) {
  const preview = document.getElementById('stgWavePreview');
  if (!preview) return;
  preview.innerHTML = '';
  const color = type === 'vib' ? '#3b9eff' : '#f5820a';
  for (let i = 0; i < 36; i += 1) {
    const bar = document.createElement('div');
    const height = 6 + Math.random() * 24;
    bar.style.cssText = `width:4px;height:${height}px;background:${color};border-radius:2px;opacity:${0.35 + Math.random() * 0.5};margin-right:2px;transition:height 0.15s ease;`;
    preview.appendChild(bar);
  }
  let ticks = 0;
  const interval = setInterval(() => {
    preview.querySelectorAll('div').forEach(bar => {
      const height = 6 + Math.random() * 24;
      bar.style.height = `${height}px`;
      bar.style.opacity = `${0.35 + Math.random() * 0.5}`;
    });
    if (++ticks >= 7) {
      clearInterval(interval);
      setTimeout(() => {
        if (preview) preview.innerHTML = '<span class="wave-preview-text">— Play a test to see waveform —</span>';
      }, 150);
    }
  }, 100);
}

function playTone(type) {
  if (!soundEnabled || !alertTypeEnabled[type]) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    if (soundWave === 'harsh') playHarsh(ctx, type, now);
    else if (soundWave === 'classic') playClassic(ctx, type, now);
    else if (soundWave === 'beep') playBeep(ctx, type, now);
    else if (soundWave === 'siren') playSiren(ctx, type, now);
    animateWavePreview(type);
  } catch (error) {
    console.warn('Audio error:', error);
  }
}

function showAlertBadge(type, message) {
  const badge = document.getElementById('soundAlertBadge');
  const messageEl = document.getElementById('soundAlertMsg');
  if (!badge || !messageEl) return;
  messageEl.textContent = message;
  badge.style.borderColor = type === 'temp' ? 'rgba(245,130,10,0.5)' : 'rgba(59,158,255,0.5)';
  badge.classList.add('visible');
  if (alertBadgeTimer) clearTimeout(alertBadgeTimer);
  alertBadgeTimer = setTimeout(hideAlertBadge, 5000);
}

function hideAlertBadge() {
  const badge = document.getElementById('soundAlertBadge');
  if (badge) badge.classList.remove('visible');
}

function updateAlertBlinkBar() {
  const bar = document.getElementById('alertBlinkBar');
  if (!bar) return;
  bar.className = 'alert-blink-indicator';
  const count = [alertState.temp, alertState.vib].filter(Boolean).length;
  if (count === 0) return;
  if (count > 1) bar.classList.add('multi-alert');
  else if (alertState.temp) bar.classList.add('temp-alert');
  else bar.classList.add('vib-alert');
}

function triggerSoundAlert(type, message) {
  if (!soundEnabled || !alertTypeEnabled[type]) return;
  if (alertState[type]) return;
  alertState[type] = true;
  playTone(type);
  alertSoundTimers[type] = setInterval(() => {
    if (alertState[type] && soundEnabled && alertTypeEnabled[type]) playTone(type);
  }, repeatInterval);
  showAlertBadge(type, message);
  const sbBadge = document.getElementById('sbAlertBadge');
  if (sbBadge) sbBadge.style.display = 'inline';
}

function clearSoundAlert(type) {
  if (!alertState[type]) return;
  alertState[type] = false;
  if (alertSoundTimers[type]) { clearInterval(alertSoundTimers[type]); alertSoundTimers[type] = null; }
  const anyActive = Object.values(alertState).some(Boolean);
  if (!anyActive) {
    const sbBadge = document.getElementById('sbAlertBadge');
    if (sbBadge) sbBadge.style.display = 'none';
    hideAlertBadge();
  }
  updateAlertBlinkBar();
}

function setSoundEnabled(value) {
  soundEnabled = value;
  const icon = document.getElementById('sbSoundIcon');
  const label = document.getElementById('sbSoundLabel');
  const pill = document.getElementById('sbTogglePill');
  if (icon) icon.textContent = value ? '🔊' : '🔇';
  if (label) label.textContent = value ? 'Sound Alerts' : 'Sound Off';
  if (pill) value ? pill.classList.add('on') : pill.classList.remove('on');
  const masterBtn = document.getElementById('stgMasterBtn');
  if (masterBtn) masterBtn.textContent = value ? '🔊 ON' : '🔇 OFF';
  try { localStorage.setItem('mechguard_sound', value ? 'on' : 'off'); } catch (e) { }
}

function toggleSoundSystem() {
  setSoundEnabled(!soundEnabled);
  if (soundEnabled) playTone('vib');
}

function onVolumeChange(value) {
  masterVolume = value / 100;
  const display = document.getElementById('stgVolDisplay');
  if (display) display.textContent = value + '%';
  const slider = document.getElementById('stgVolSlider');
  if (slider) slider.style.background = `linear-gradient(90deg,#00d4ff ${value}%,#1a2e45 ${value}%)`;
  try { localStorage.setItem('mechguard_vol', value); } catch (e) { }
}

function onRepeatChange(value) {
  repeatInterval = value * 1000;
  const display = document.getElementById('stgRepeatDisplay');
  if (display) display.textContent = value + 's';
  const slider = document.getElementById('stgRepeatSlider');
  const pct = (value - 1) / 9 * 100;
  if (slider) slider.style.background = `linear-gradient(90deg,#ffb84d ${pct}%,#1a2e45 ${pct}%)`;
  try { localStorage.setItem('mechguard_repeat', value); } catch (e) { }
}

function selectWave(button) {
  if (!button) return;
  soundWave = button.dataset.wave || soundWave;
  document.querySelectorAll('.stg-wave-btn').forEach(b => b.classList.toggle('stg-wave-active', b === button));
  try { localStorage.setItem('mechguard_wave', soundWave); } catch (e) { }
  playTone('temp');
}

function toggleAlertType(type) {
  alertTypeEnabled[type] = !alertTypeEnabled[type];
  const toggle = document.getElementById('stg' + type.charAt(0).toUpperCase() + type.slice(1) + 'Toggle');
  if (toggle) toggle.dataset.on = alertTypeEnabled[type] ? 'true' : 'false';
  try { localStorage.setItem('mechguard_alert_' + type, alertTypeEnabled[type] ? '1' : '0'); } catch (e) { }
}

function testAllSounds() {
  ['temp', 'vib'].forEach((type, index) => setTimeout(() => playTone(type), index * 900));
}

function saveThresholds() {
  const tempValue = parseFloat(document.getElementById('threshTemp')?.value) || 50;
  const vibValue = parseFloat(document.getElementById('threshVib')?.value) || 5;
  thresholds.temp = tempValue;
  thresholds.vib = vibValue;
  try { localStorage.setItem('mechguard_thresh', JSON.stringify(thresholds)); } catch (e) { }
}

function loadSettingsFromStorage() {
  try {
    const vol = localStorage.getItem('mechguard_vol');
    if (vol) { document.getElementById('stgVolSlider').value = vol; onVolumeChange(parseInt(vol, 10)); }
    const rep = localStorage.getItem('mechguard_repeat');
    if (rep) { document.getElementById('stgRepeatSlider').value = rep; onRepeatChange(parseInt(rep, 10)); }
    const wave = localStorage.getItem('mechguard_wave');
    if (wave) {
      soundWave = wave;
      document.querySelectorAll('.stg-wave-btn').forEach(b => b.classList.toggle('stg-wave-active', b.dataset.wave === wave));
    }
    ['temp', 'vib'].forEach(type => {
      const stored = localStorage.getItem('mechguard_alert_' + type);
      if (stored !== null) {
        alertTypeEnabled[type] = stored === '1';
        const toggle = document.getElementById('stg' + type.charAt(0).toUpperCase() + type.slice(1) + 'Toggle');
        if (toggle) toggle.dataset.on = alertTypeEnabled[type] ? 'true' : 'false';
      }
    });
    const thr = localStorage.getItem('mechguard_thresh');
    if (thr) {
      const parsed = JSON.parse(thr);
      if (parsed.temp != null) thresholds.temp = parsed.temp;
      if (parsed.vib != null) thresholds.vib = parsed.vib;
      if (document.getElementById('threshTemp')) document.getElementById('threshTemp').value = thresholds.temp;
      if (document.getElementById('threshVib')) document.getElementById('threshVib').value = thresholds.vib;
    }
  } catch (e) { }
}

const alertState = { temp: false, vib: false };

function attachAlertListeners() {
  MG.bindClick('#sbSoundBtn', toggleSoundSystem);
  MG.bindClick('#stgMasterBtn', toggleSoundSystem);
  MG.bindClick('#stgTempToggle', () => toggleAlertType('temp'));
  MG.bindClick('#stgVibToggle', () => toggleAlertType('vib'));
  document.querySelectorAll('.stg-wave-btn').forEach(button => {
    button.addEventListener('click', () => selectWave(button));
  });
  const volSlider = document.getElementById('stgVolSlider');
  if (volSlider) volSlider.addEventListener('input', e => onVolumeChange(e.target.value));
  const repSlider = document.getElementById('stgRepeatSlider');
  if (repSlider) repSlider.addEventListener('input', e => onRepeatChange(e.target.value));
  MG.bindClick('#alertTestBtn', testAllSounds);
}

document.addEventListener('DOMContentLoaded', function () {
  attachAlertListeners();
  loadSettingsFromStorage();
});
