
/* Page guard + cross-page logout */
(function(){
  try{ const s=JSON.parse(localStorage.getItem('mechguard_session')||'null');
       if(!s||!s.loggedIn){ window.location.href='login.html'; return; }
       window.__MG_SESSION = s;
  }catch(e){ window.location.href='login.html'; }
})();
function doLogout(){
  localStorage.removeItem('mechguard_session');
  if(typeof closeSidebar==='function') closeSidebar();
  window.location.href='index.html';
}

/* ══════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════ */
/* ══════════════════════════════════
   AUTH
══════════════════════════════════ */
/* ══════════════════════════════════
   LANDING PAGE — Scroll reveal + cursor glow
══════════════════════════════════ */
const reveals=document.querySelectorAll('.reveal');
const io=new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } }); },{threshold:0.15});
reveals.forEach(el=>io.observe(el));

const glow=document.createElement('div');
Object.assign(glow.style,{position:'fixed',pointerEvents:'none',zIndex:'9999',width:'320px',height:'320px',borderRadius:'50%',background:'radial-gradient(circle, rgba(0,245,255,0.07) 0%, transparent 70%)',transform:'translate(-50%,-50%)',transition:'left 0.12s ease, top 0.12s ease',left:'-999px',top:'-999px'});
document.body.appendChild(glow);
document.addEventListener('mousemove',e=>{ glow.style.left=e.clientX+'px'; glow.style.top=e.clientY+'px'; });

/* ══════════════════════════════════
   GAUGE ENGINE
══════════════════════════════════ */
const GC=326.73, HRC=389.56;
function setGauge(id,pct){ const el=document.getElementById(id); if(el) el.style.strokeDashoffset=GC-(GC*Math.min(100,Math.max(0,pct))/100); }
function setHealthGauge(pct){ const el=document.getElementById('healthRing'); if(el) el.style.strokeDashoffset=HRC-(HRC*Math.min(100,Math.max(0,pct))/100); }

/* ══════════════════════════════════
   DASHBOARD INIT
══════════════════════════════════ */
let lineChart, dashReady=false;
function tickClock(){ const el=document.getElementById('clock'); if(el) el.textContent=new Date().toLocaleTimeString('en-GB'); }

function initDashboard(){
  dashReady=true;
  tickClock(); setInterval(tickClock,1000);
  const ctx=document.getElementById('dataChart').getContext('2d');
  lineChart=new Chart(ctx,{type:'line',data:{labels:['--','--','--','--','--','--'],datasets:[{label:'Temp (°C)',data:[0,0,0,0,0,0],borderColor:'#f5820a',backgroundColor:'rgba(245,130,10,0.08)',tension:0.4,fill:true,yAxisID:'y'},{label:'Current',data:[0,0,0,0,0,0],borderColor:'#ffb300',backgroundColor:'rgba(255,179,0,0.06)',tension:0.4,fill:false,yAxisID:'y3'}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#6b7590',font:{family:'Share Tech Mono',size:10}}},tooltip:{backgroundColor:'#131720',titleColor:'#e8ecf4',bodyColor:'#6b7590',borderColor:'#2a3045',borderWidth:1}},scales:{y:{type:'linear',position:'left',grid:{color:'rgba(42,48,69,0.5)'},ticks:{color:'#6b7590',font:{family:'Share Tech Mono',size:10}},title:{display:true,text:'Temp °C',color:'#f5820a',font:{family:'Share Tech Mono'}}},y3:{type:'linear',position:'right',grid:{drawOnChartArea:false},ticks:{color:'#ffb300',font:{family:'Share Tech Mono',size:10}},title:{display:true,text:'Current',color:'#ffb300',font:{family:'Share Tech Mono'}}},x:{grid:{color:'rgba(42,48,69,0.5)'},ticks:{color:'#6b7590',font:{family:'Share Tech Mono',size:10}}}}}});
  const bCtx=document.getElementById('barChart').getContext('2d');
  new Chart(bCtx,{type:'bar',data:{labels:['08','09','10','11','12','13','14','15','16','17'],datasets:[{label:'Objects/hr',data:[820,910,870,950,760,880,920,910,880,647],backgroundColor:'rgba(255,179,0,0.5)',borderColor:'#ffb300',borderWidth:1,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#131720',titleColor:'#e8ecf4',bodyColor:'#6b7590',borderColor:'#2a3045',borderWidth:1}},scales:{y:{grid:{color:'rgba(42,48,69,0.5)'},ticks:{color:'#6b7590',font:{family:'Share Tech Mono',size:10}}},x:{grid:{color:'rgba(42,48,69,0.5)'},ticks:{color:'#6b7590',font:{family:'Share Tech Mono',size:10}}}}}});
  const savedIP=localStorage.getItem('mechguard_esp_ip')||'';
  if(savedIP){ document.getElementById('espIpInput').value=savedIP; espIP=savedIP; startFetching(); }
  initSchedule();
  
}

/* ══════════════════════════════════
   ESP8266 INTEGRATION
══════════════════════════════════ */
let espIP='', fetchTimer=null, isOnline=false, lastCurrent=0;
function saveESPIP(){ const ip=document.getElementById('espIpInput').value.trim().replace(/\/+$/,''); if(!ip){ showIPStatus('❌ IP khali hai!','error'); return; } espIP=ip; localStorage.setItem('mechguard_esp_ip',ip); showIPStatus('✅ Saved — connecting...','ok'); startFetching(); }
function showIPStatus(msg,type){ const el=document.getElementById('ipStatus'); if(!el) return; el.textContent=msg; el.style.color=type==='ok'?'#22d87a':type==='error'?'#f03e3e':'#ffb84d'; }
function setConnStatus(online){ isOnline=online; const dot=document.getElementById('connDot'),txt=document.getElementById('connText'),pill=document.getElementById('connPill'); if(!dot) return; if(online){ dot.style.background='#22d87a';txt.textContent='ESP8266 LIVE';pill.style.borderColor='rgba(34,216,122,0.3)';pill.style.background='rgba(34,216,122,0.1)';txt.style.color='#22d87a'; }else{ dot.style.background='#f03e3e';txt.textContent='OFFLINE';pill.style.borderColor='rgba(240,62,62,0.3)';pill.style.background='rgba(240,62,62,0.08)';txt.style.color='#f03e3e'; }
  /* Sync AI panel connection badge */
  if(!online) setAIConnection(false);
}
async function fetchData(){ if(!espIP){ showIPStatus('⚠️ IP set karo pehle!','warn'); return; } try{ const res=await fetch(`http://${espIP}/data`,{signal:AbortSignal.timeout(3000)}); if(!res.ok) throw new Error(); const d=await res.json(); setConnStatus(true); showIPStatus(`✅ Live — ${espIP}`,'ok'); applyData(d); }catch(e){ setConnStatus(false); showIPStatus(`❌ Fail: ${espIP}`,'error'); } }
function applyData(d){
  const temp=parseFloat(d.temperature)||0,vibCnt=parseInt(d.punchCount)||0,vibR=parseFloat(d.vibRate)||0,vibAct=d.vibActive===true,curA=parseInt(d.irPunchCount)||0,pwrKw=parseFloat(d.irPunchRate)||0,relayOn=d.irDetected===true,health=parseFloat(d.health)||0,eff=parseFloat(d.efficiency)||0,status=d.status||'UNKNOWN',uptime=parseInt(d.uptime)||0;
  lastCurrent=curA;
  setText('kpiTemp',temp.toFixed(1)); setBadge('kpiTempBadge',temp>60?'crit':temp>50?'warn':'ok',temp>60?'CRITICAL':temp>50?'HIGH':'NORMAL');
  setText('kpiVibCount',vibCnt.toLocaleString()); setBadge('kpiVibBadge',vibCnt>90?'crit':vibCnt>50?'warn':'ok',vibCnt>90?'DANGER':vibCnt>50?'HIGH':'NORMAL');
  setText('kpiVibRate',vibR.toFixed(2)); setBadge('kpiVibRateBadge',vibR>5?'crit':vibR>2?'warn':'ok',vibR>5?'HIGH':vibR>0.5?'ACTIVE':'LOW');
  setText('kpiCurrent',curA.toLocaleString()); setBadge('kpiCurrentBadge',curA>90?'crit':'cur-off',curA>90?'DANGER!':'NORMAL');
  setText('kpiPower',pwrKw.toFixed(2)); setBadge('kpiPowerBadge',pwrKw>5?'crit':pwrKw>2?'warn':'cur-off',pwrKw>5?'HIGH':pwrKw>0.5?'ACTIVE':'LOW');
  setText('kpiRelay',relayOn?'ON':'OFF'); setBadge('kpiRelayBadge',relayOn?'cur-on':'cur-off',relayOn?'TRIGGERED':'IDLE');
  document.getElementById('kpiRelay').style.color=relayOn?'#ffb300':'#22d87a';
  setText('gTempVal',temp.toFixed(1)+'°C'); setText('gVibRateVal',vibR.toFixed(2)); setText('gCurrentVal',curA.toLocaleString()); setText('gPowerVal',pwrKw.toFixed(2)); setText('gEffVal',eff.toFixed(0)+'%');
  setGauge('gTemp',(temp/100)*100); setGauge('gVibRate',Math.min(100,(vibR/10)*100)); setGauge('gCurrent',Math.min(100,(curA/200)*100)); setGauge('gPower',Math.min(100,(pwrKw/10)*100)); setGauge('gEff',Math.min(100,eff)); setHealthGauge(health);
  const beamBar=document.getElementById('relayBar'),beamTxt=document.getElementById('relayText');
  if(relayOn){beamBar.className='relay-indicator blocked';beamTxt.textContent='ON';}else{beamBar.className='relay-indicator clear';beamTxt.textContent='OFF';}
  setText('healthPct',health.toFixed(0)+'%');
  const hEl=document.getElementById('healthPct'); if(hEl) hEl.style.color=health>=70?'#22d87a':health>=40?'#fb923c':'#f03e3e';
  const badge=document.getElementById('healthBadge');
  if(health>=70){badge.className='health-badge';badge.innerHTML='✅ &nbsp;GOOD CONDITION';}else if(health>=40){badge.className='health-badge warn';badge.innerHTML='⚠️ &nbsp;NEEDS ATTENTION';}else{badge.className='health-badge crit';badge.innerHTML='🔴 &nbsp;CRITICAL';}
  const pill=document.getElementById('mainStatusPill');
  if(pill){pill.innerHTML=`<div class="status-dot" style="background:${health>=70?'#22d87a':'#f03e3e'}"></div>${status}`;pill.style.borderColor=health>=70?'rgba(34,216,122,0.3)':'rgba(240,62,62,0.3)';pill.style.background=health>=70?'rgba(34,216,122,0.1)':'rgba(240,62,62,0.1)';pill.style.color=health>=70?'#22d87a':'#f03e3e';}
  setText('msVibRate',vibR.toFixed(2)+'/s'); setText('msPower',pwrKw.toFixed(2)+'/s'); setText('msUptime',uptime+'s'); setText('msEff',eff.toFixed(0)+'%');
  setText('stTemp',temp.toFixed(1)+'°C'); setText('stCurrent',curA.toLocaleString()); setText('stPower',pwrKw.toFixed(2)+'/s'); setText('stVibCount',vibCnt.toLocaleString()); setText('stVibRate',vibR.toFixed(2)+'/s'); setText('stHealth',health.toFixed(0)+'%'); setText('stStatus',status);
  const aEl=document.getElementById('alertStrip');
  if(aEl){let aMsg='',aColor='';if(temp>60){aMsg=`⚠️ TEMP CRITICAL: ${temp.toFixed(1)}°C`;aColor='rgba(240,62,62,0.15)';aEl.style.color='#f03e3e';}else if(curA>90){aMsg=`⚡ CURRENT HIGH: ${curA}`;aColor='rgba(255,179,0,0.12)';aEl.style.color='#ffb300';}else{aMsg=`✅ ALL NORMAL — Temp:${temp.toFixed(1)}°C | Cur:${curA} | Vib:${vibCnt}`;aColor='rgba(34,216,122,0.06)';aEl.style.color='#22d87a';}aEl.style.background=aColor;aEl.innerHTML=`<div class="alert-dot"></div>${aMsg}`;}
  const now=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(lineChart){lineChart.data.labels.push(now);lineChart.data.labels.shift();lineChart.data.datasets[0].data.push(parseFloat(temp.toFixed(1)));lineChart.data.datasets[0].data.shift();lineChart.data.datasets[1].data.push(parseFloat(hum.toFixed(0)));lineChart.data.datasets[1].data.shift();lineChart.data.datasets[2].data.push(curA);lineChart.data.datasets[2].data.shift();lineChart.update('none');}
  
  updateAIMetrics(temp,hum,vibCnt,vibR,curA,pwrKw,health,eff,status);
}
function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function setBadge(id,cls,txt){const el=document.getElementById(id);if(!el)return;el.textContent=txt;el.className='kpi-badge '+cls;}
function startFetching(){if(fetchTimer)clearInterval(fetchTimer);fetchData();fetchTimer=setInterval(fetchData,2500);}
async function resetCurrent(){if(!espIP){alert('Pehle ESP8266 IP set karo!');return;}try{await fetch(`http://${espIP}/reset-current`);showIPStatus('✅ Current reset!','ok');}catch(e){showIPStatus('❌ Current Reset fail','error');}}
async function resetVib(){if(!espIP){alert('Pehle ESP8266 IP set karo!');return;}try{await fetch(`http://${espIP}/reset-vib`);showIPStatus('✅ Vib reset!','ok');}catch(e){showIPStatus('❌ Vib Reset fail','error');}}

/* ══ SERVICE SCHEDULE ══ */
const LS_START='mechguard_startDate',LS_END='mechguard_endDate';
function fmtDate(s){if(!s)return'— Select Date —';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
function daysLeft(s){if(!s)return null;const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(s+'T00:00:00')-t)/86400000);}
function daysLbl(n){if(n===null)return'CLICK TO SET DATE';if(n<0)return Math.abs(n)+' DAYS OVERDUE';if(n===0)return'DUE TODAY';return n+' DAYS LEFT';}
function calcProg(s,e){if(!s||!e)return null;const t=new Date();t.setHours(0,0,0,0);const st=new Date(s+'T00:00:00'),en=new Date(e+'T00:00:00');if(en<=st)return null;return Math.min(100,Math.max(0,Math.round(((t-st)/(en-st))*100)));}
function updateScheduleUI(){const s=localStorage.getItem(LS_START)||'',e=localStorage.getItem(LS_END)||'';setText('startDateDisplay',fmtDate(s));const sd=daysLeft(s);setText('startDaysLeft',daysLbl(sd));if(document.getElementById('startDaysLeft'))document.getElementById('startDaysLeft').style.color=sd!==null&&sd<=7?'#f03e3e':sd!==null&&sd<=30?'#ffb84d':'';setText('endDateDisplay',fmtDate(e));const ed=daysLeft(e);setText('endDaysLeft',daysLbl(ed));if(document.getElementById('endDaysLeft'))document.getElementById('endDaysLeft').style.color=ed!==null&&ed<=30?'#f03e3e':ed!==null&&ed<=90?'#ffb84d':'';const p=calcProg(s,e),fill=document.getElementById('progFill'),pctEl=document.getElementById('progPct');if(p!==null&&fill&&pctEl){fill.style.width=p+'%';pctEl.textContent=p;}else if(fill&&pctEl){fill.style.width='0%';pctEl.textContent='0';}}
function initSchedule(){if(!localStorage.getItem(LS_START)){const d=new Date();d.setDate(d.getDate()+4);localStorage.setItem(LS_START,d.toISOString().slice(0,10));}if(!localStorage.getItem(LS_END)){const d=new Date();d.setDate(d.getDate()+139);localStorage.setItem(LS_END,d.toISOString().slice(0,10));}updateScheduleUI();setInterval(updateScheduleUI,60000);}

/* ══ CALENDAR ══ */
let calWhich='start',calYear=new Date().getFullYear(),calMonth=new Date().getMonth(),calSel=null;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function openDatePicker(w){calWhich=w;const saved=localStorage.getItem(w==='start'?LS_START:LS_END);if(saved){const d=new Date(saved+'T00:00:00');calYear=d.getFullYear();calMonth=d.getMonth();calSel=saved;}else{const n=new Date();calYear=n.getFullYear();calMonth=n.getMonth();calSel=null;}setText('calWhichLabel',w==='start'?'📅 Next Service Date':'🔩 Major Overhaul Date');renderCal();document.getElementById('calOverlay').classList.add('open');}
function renderCal(){const today=new Date();today.setHours(0,0,0,0);const fd=new Date(calYear,calMonth,1).getDay(),dim=new Date(calYear,calMonth+1,0).getDate();setText('calMonthLabel',MONTHS[calMonth]+' '+calYear);setText('calYearLabel',calYear);const g=document.getElementById('calDays');g.innerHTML='';for(let i=0;i<fd;i++){const b=document.createElement('div');b.className='cal-day empty';g.appendChild(b);}for(let d=1;d<=dim;d++){const cell=document.createElement('div');cell.className='cal-day';cell.textContent=d;const ds=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');const dt=new Date(calYear,calMonth,d);if(dt.getTime()===today.getTime())cell.classList.add('today');if(ds===calSel)cell.classList.add('selected');cell.onclick=()=>calPick(ds);g.appendChild(cell);}}
function calPick(ds){calSel=ds;renderCal();setTimeout(()=>{localStorage.setItem(calWhich==='start'?LS_START:LS_END,ds);updateScheduleUI();closeCalendar();},180);}
function calSelectToday(){const t=new Date();calPick(t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'));}
function calShiftMonth(d){calMonth+=d;if(calMonth<0){calMonth=11;calYear--;}if(calMonth>11){calMonth=0;calYear++;}renderCal();}
function calShiftYear(d){calYear+=d;renderCal();}
function closeCalendar(){document.getElementById('calOverlay').classList.remove('open');}
function closeCalIfOutside(e){if(e.target===document.getElementById('calOverlay'))closeCalendar();}


/* ══ AI ENGINE v8 — DYNAMIC STATUS SYSTEM ══ */
let lastSensorSnapshot=null;

/* Trend tracking — previous values */
let _prevTemp=null,_prevVibR=null,_prevEff=null;

/* Connection state for AI panel */
let _aiConnected=false;

function setAIConnection(connected){
  _aiConnected=connected;
  const badge=document.getElementById('aiConnBadge');
  const txt=document.getElementById('aiConnText');
  const blink=document.getElementById('aiBlink');
  if(!badge||!txt) return;
  if(connected){
    badge.className='ai-conn-badge connected';
    txt.textContent='LIVE DATA CONNECTED';
    if(blink){ blink.style.background='#22d87a'; blink.style.boxShadow='0 0 8px #22d87a'; }
  } else {
    badge.className='ai-conn-badge disconnected';
    txt.textContent='WAITING FOR SENSOR DATA';
    if(blink){ blink.style.background='#9b6dff'; blink.style.boxShadow=''; }
  }
}

/* Get trend arrow + class based on delta */
function getTrend(current, prev, invertGood){
  if(prev===null) return {txt:'→ Stable', cls:'trend-stab'};
  const delta=current-prev;
  const threshold=Math.abs(prev)*0.02 || 0.05;
  if(Math.abs(delta)<threshold) return {txt:'→ Stable', cls:'trend-stab'};
  if(delta>0) return invertGood
    ? {txt:'↑ Rising', cls:'trend-up'}
    : {txt:'↑ Rising', cls:'trend-up'};
  return invertGood
    ? {txt:'↓ Dropping', cls:'trend-down'}
    : {txt:'↓ Dropping', cls:'trend-down'};
}

/* Map temp value to status level */
function getTempStatusLevel(temp){
  if(temp>70)  return 'critical';
  if(temp>50)  return 'high';
  if(temp>35)  return 'medium';
  return 'normal';
}
/* Map vibR to status level */
function getVibStatusLevel(vibR){
  if(vibR>5)   return 'high';
  if(vibR>2)   return 'medium';
  return 'normal';
}
/* Map health/eff to voltage-proxy status level */
function getVoltStatusLevel(health,eff){
  const avg=(health+eff)/2;
  if(avg<40)   return 'high';
  if(avg<65)   return 'medium';
  return 'normal';
}

/* Apply status level to a live card */
function applyLiveCardStatus(cardId,valId,statusId,trendId,value,unit,statusLevel,trendObj,labelMap){
  const card=document.getElementById(cardId);
  const valEl=document.getElementById(valId);
  const statEl=document.getElementById(statusId);
  const trendEl=document.getElementById(trendId);
  if(!card||!valEl||!statEl||!trendEl) return;

  const clsMap={normal:'s-normal',medium:'s-medium',high:'s-high',critical:'s-critical'};
  const colMap={normal:'c-normal',medium:'c-medium',high:'c-high',critical:'c-critical'};
  const lbl=labelMap[statusLevel]||statusLevel.toUpperCase();

  card.className='ai-live-card '+clsMap[statusLevel];
  valEl.className='ai-live-val '+colMap[statusLevel];
  valEl.textContent=value+' '+unit;
  statEl.className='ai-live-status '+colMap[statusLevel];
  statEl.textContent=lbl;
  trendEl.className='ai-live-trend '+trendObj.cls;
  trendEl.textContent=trendObj.txt;
}

/* Flash metric card on status change */
function flashCard(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.remove('status-flash');
  void el.offsetWidth; // reflow
  el.classList.add('status-flash');
  setTimeout(()=>el.classList.remove('status-flash'),700);
}

/* Update ai-panel border glow based on global status */
function updatePanelGlow(scoreLevel){
  const panel=document.getElementById('ai-panel');
  if(!panel) return;
  panel.className='ai-panel status-'+scoreLevel;
}

function updateAIMetrics(temp,hum,vibCnt,vibR,curA,pwrKw,health,eff,status){
  lastSensorSnapshot={temp,hum,vibCnt,vibR,curA,pwrKw,health,eff,status};

  /* ── Connection flag ── */
  setAIConnection(true);

  /* ── Score calculation (unchanged logic) ── */
  let score=0;
  const tempScore=temp>60?1:temp>50?0.5:temp>40?0.2:0;
  const vibScore=vibR>5?1:vibR>2?0.5:vibR>0.5?0.15:0;
  const irScore=pwrKw>5?0.8:pwrKw>3?0.4:curA>90?0.3:0;
  const effScore=eff<40?1:eff<60?0.5:eff<75?0.2:0;
  score=Math.min(1,tempScore*0.30+vibScore*0.35+irScore*0.20+effScore*0.15);
  const anomalyPct=Math.round(score*100);

  /* ── Trend calc ── */
  const tempTrend=getTrend(temp,_prevTemp,false);
  const vibTrend =getTrend(vibR,_prevVibR,false);
  const effTrend2=getTrend(eff,_prevEff,true); // higher eff = good (down = bad)

  /* ── Live Readings ── */
  const tempLevel=getTempStatusLevel(temp);
  const vibLevel=getVibStatusLevel(vibR);
  const voltLevel=getVoltStatusLevel(health,eff);

  const tempLabels={normal:'NORMAL',medium:'MEDIUM',high:'HIGH',critical:'CRITICAL'};
  const vibLabels ={normal:'NORMAL',medium:'MEDIUM',high:'HIGH',critical:'CRITICAL'};
  const voltLabels={normal:'STABLE',medium:'FLUCTUATING',high:'DANGER',critical:'CRITICAL'};

  applyLiveCardStatus('aiLiveTempCard','aiLiveTempVal','aiLiveTempStatus','aiLiveTempTrend',
    temp.toFixed(1),'°C',tempLevel,tempTrend,tempLabels);
  applyLiveCardStatus('aiLiveVibCard','aiLiveVibVal','aiLiveVibStatus','aiLiveVibTrend',
    vibR.toFixed(2),'/s',vibLevel,vibTrend,vibLabels);
  applyLiveCardStatus('aiLiveVoltCard','aiLiveVoltVal','aiLiveVoltStatus','aiLiveVoltTrend',
    eff.toFixed(0)+'% / '+health.toFixed(0)+'%','',voltLevel,effTrend2,voltLabels);

  /* ── Save prev ── */
  _prevTemp=temp; _prevVibR=vibR; _prevEff=eff;

  /* ── Anomaly card ── */
  const aBar=document.getElementById('aiAnomalyBar');
  const aEl=document.getElementById('aiAnomalyScore');
  const aLbl=document.getElementById('aiAnomalyLabel');
  setText('aiAnomalyScore',score.toFixed(2));
  if(score>=0.6){
    if(aEl) aEl.className='ai-metric-val ai-status-critical';
    if(aBar){aBar.className='ai-metric-bar-fill ai-bar-critical';aBar.style.width=anomalyPct+'%';}
    if(aLbl) aLbl.textContent='Critical anomaly!';
  } else if(score>=0.3){
    if(aEl) aEl.className='ai-metric-val ai-status-warning';
    if(aBar){aBar.className='ai-metric-bar-fill ai-bar-warning';aBar.style.width=anomalyPct+'%';}
    if(aLbl) aLbl.textContent='Warning-level anomaly';
  } else {
    if(aEl) aEl.className='ai-metric-val ai-status-normal';
    if(aBar){aBar.className='ai-metric-bar-fill ai-bar-normal';aBar.style.width=Math.max(5,anomalyPct)+'%';}
    if(aLbl) aLbl.textContent='No anomalies';
  }

  /* ── AI Status card ── */
  let aiStatus,aiConf,statusClass,barClass,panelLevel;
  if(score>=0.6||temp>60){
    aiStatus='CRITICAL';aiConf=Math.round(75+score*20)+'%';statusClass='ai-status-critical';barClass='ai-bar-critical';panelLevel='critical';
  } else if(score>=0.25||temp>50||vibR>2){
    aiStatus='WARNING';aiConf=Math.round(65+score*25)+'%';statusClass='ai-status-warning';barClass='ai-bar-warning';panelLevel='high';
  } else if(score>=0.1||temp>35){
    aiStatus='MEDIUM';aiConf=Math.round(80+(1-score)*10)+'%';statusClass='ai-status-warning';barClass='ai-bar-warning';panelLevel='medium';
  } else {
    aiStatus='NORMAL';aiConf=Math.round(85+(1-score)*12)+'%';statusClass='ai-status-normal';barClass='ai-bar-normal';panelLevel='normal';
  }

  const sEl=document.getElementById('aiStatusVal');
  const prevStatus=sEl?sEl.textContent:'';
  if(sEl){sEl.textContent=aiStatus;sEl.className='ai-metric-val '+statusClass;}
  if(prevStatus!==aiStatus){flashCard('aiCardStatus');flashCard('aiCardAnomaly');}
  setText('aiConfidence','Confidence: '+aiConf);
  const cBar=document.getElementById('aiConfBar');
  if(cBar){cBar.className='ai-metric-bar-fill '+barClass;cBar.style.width=aiConf;}

  /* ── Panel glow ── */
  updatePanelGlow(panelLevel);

  /* ── Risk card ── */
  let risk,riskPct,riskColor;
  if(score>=0.6){risk='HIGH';riskPct=80;riskColor='#f03e3e';}
  else if(score>=0.3){risk='MEDIUM';riskPct=50;riskColor='#ffb84d';}
  else{risk='LOW';riskPct=15;riskColor='#9b6dff';}
  const rEl=document.getElementById('aiRiskVal');
  if(rEl){rEl.textContent=risk;rEl.style.color=riskColor;}
  const rBar=document.getElementById('aiRiskBar');
  if(rBar)rBar.style.width=riskPct+'%';

  /* ── TTF card ── */
  let ttf,ttfColor;
  if(score>=0.7){ttf='< 2 hrs';ttfColor='#f03e3e';}
  else if(score>=0.3){ttf='1–3 days';ttfColor='#ffb84d';}
  else{ttf='> 30 days';ttfColor='#22d87a';}
  const tEl=document.getElementById('aiTTFVal');
  if(tEl){tEl.textContent=ttf;tEl.style.color=ttfColor;}

  /* ── Recommendations ── */
  const recs=[];
  if(temp>70) recs.push({icon:'🚨',txt:'EMERGENCY: Temperature CRITICAL — shut down immediately!'});
  else if(temp>50) recs.push({icon:'🔥',txt:`HIGH TEMP: ${temp.toFixed(1)}°C — check cooling system`});
  if(vibR>5) recs.push({icon:'📳',txt:'CRITICAL vibration — inspect bearings and mountings now'});
  else if(vibR>2) recs.push({icon:'⚠️',txt:`Vibration elevated at ${vibR.toFixed(2)}/s — monitor closely`});
  if(eff<60) recs.push({icon:'📉',txt:`Efficiency low (${eff.toFixed(0)}%) — inspect drive system`});
  if(recs.length===0){
    recs.push({icon:'✅',txt:'All parameters within normal operating range.'});
    recs.push({icon:'📅',txt:'Continue scheduled maintenance as planned.'});
  }
  const recList=document.getElementById('aiRecList');
  if(recList) recList.innerHTML=recs.map(r=>`<div class="ai-rec-item"><span class="ai-rec-icon">${r.icon}</span>${r.txt}</div>`).join('');

  /* ── Predict strip ── */
  const maintDays=score<0.1?'~30 days':score<0.3?'~14 days':'~7 days';
  const failProb=Math.round(score*100)+'%';
  const effTrendTxt=eff>80?'↗ Improving':eff>65?'→ Stable':'↘ Declining';
  const autoAct=score>=0.6?'⚠ AUTO-SHUTDOWN':score>=0.3?'⚡ ALERT MODE':'✅ MONITORING';
  const pmEl=document.getElementById('aiPredictMaint');
  if(pmEl) pmEl.innerHTML=`Next Maintenance: <span style="color:#ffb84d">${maintDays}</span>`;
  const pfEl=document.getElementById('aiPredictFailure');
  if(pfEl) pfEl.innerHTML=`Failure Probability: <span style="color:${score>=0.5?'#f03e3e':'#9b6dff'}">${failProb}</span>`;
  const peEl=document.getElementById('aiPredictEff');
  if(peEl) peEl.innerHTML=`Efficiency Trend: <span style="color:${eff>80?'#22d87a':eff>65?'#ffb84d':'#f03e3e'}">${effTrendTxt}</span>`;
  const aaEl=document.getElementById('aiAutoAction');
  if(aaEl){aaEl.textContent=autoAct;aaEl.style.color=score>=0.6?'#f03e3e':score>=0.3?'#ffb84d':'#00d4ff';}

  /* ── Thinking badge ── */
  const badge=document.getElementById('aiThinkingBadge');
  if(badge){
    badge.textContent=aiStatus;
    badge.style.color=score>=0.6?'#f03e3e':score>=0.3?'#ffb84d':'#22d87a';
    badge.style.background=score>=0.6?'rgba(240,62,62,0.12)':score>=0.3?'rgba(255,184,77,0.1)':'rgba(34,216,122,0.1)';
    badge.style.borderColor=score>=0.6?'rgba(240,62,62,0.35)':score>=0.3?'rgba(255,184,77,0.25)':'rgba(34,216,122,0.25)';
  }
}

async function runAIAnalysis(){
  const btn=document.getElementById('btnAIAnalyze'),ic=document.getElementById('aiInsightContent');
  if(!lastSensorSnapshot){ic.innerHTML='<div class="ai-insight-loading"><div class="ai-dots"><span></span><span></span><span></span></div>No sensor data yet.</div>';return;}
  btn.disabled=true;btn.textContent='⏳ ANALYZING...';
  ic.innerHTML='<div class="ai-insight-loading"><div class="ai-dots"><span></span><span></span><span></span></div>Claude AI analyzing...</div>';
  const s=lastSensorSnapshot;
  const prompt=`You are an industrial AI engineer analyzing a industrial motor. Sensor data: Temp=${s.temp.toFixed(1)}°C, Vib Rate=${s.vibR.toFixed(2)}/s, Current=${s.curA}, Power=${s.pwrKw.toFixed(2)}/s, Health=${s.health.toFixed(0)}%, Efficiency=${s.eff.toFixed(0)}%. In 3 sentences: classify condition, identify risk, give immediate action.`;
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    const data=await res.json();
    const txt=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    ic.innerHTML=`<div class="ai-insight-text">${txt||'Analysis complete.'}</div>`;
  }catch(e){
    let ins=s.temp>60?`CRITICAL: Temperature at ${s.temp.toFixed(1)}°C — shut down immediately.`:s.vibR>5?`WARNING: Vibration at ${s.vibR.toFixed(2)}/s — inspect bearings.`:`Machine normal — temp ${s.temp.toFixed(1)}°C, vib ${s.vibR.toFixed(2)}/s.`;
    ic.innerHTML=`<div class="ai-insight-text">${ins}</div>`;
  }
  btn.disabled=false;btn.textContent='⚡ RUN AI ANALYSIS';
}




/* ══════════════════════════════════════════
   REPORT CENTER ENGINE
══════════════════════════════════════════ */
const LS_REPORT_HIST='mechguard_report_history';

function loadReportHistory(){ try{ return JSON.parse(localStorage.getItem(LS_REPORT_HIST)||'[]'); }catch(e){ return []; } }
function saveReportHistory(arr){ localStorage.setItem(LS_REPORT_HIST,JSON.stringify(arr.slice(-50))); }

function nowStamp(){ const d=new Date(); return d.toISOString(); }
function fmtTime(iso){ try{ return new Date(iso).toLocaleTimeString('en-GB'); }catch(e){ return '--'; } }
function fmtFullDate(iso){ try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch(e){ return '--'; } }

function buildReportContent(){
  const s=lastSensorSnapshot||{temp:0,vibCnt:0,vibR:0,curA:0,pwrKw:0,health:0,eff:0,status:'NO DATA'};
  return {
    generatedAt:new Date().toLocaleString('en-GB'),
    machine:'INDUSTRIAL MACHINE — UNIT A | LINE 3',
    snapshot:s
  };
}

function downloadFile(filename, content, mime){
  const blob=new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),200);
}

function generatePDFReport(){
  const r=buildReportContent();
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MECHGUARD Report ${r.generatedAt}</title>
  <style>body{font-family:Arial;color:#0a0a0a;padding:40px;max-width:780px;margin:0 auto;}
  h1{color:#0284c7;border-bottom:3px solid #f5820a;padding-bottom:10px;letter-spacing:2px;}
  h2{color:#dc2626;margin-top:24px;}
  .meta{color:#555;font-size:13px;}
  .kpi{display:inline-block;margin:6px 12px 6px 0;padding:10px 14px;background:#f1f5f9;border-left:4px solid #0284c7;}
  .footer{margin-top:30px;padding-top:14px;border-top:1px solid #ccc;color:#666;font-size:11px;text-align:center;}
  </style></head><body>
  <h1>⚙️ MECHGUARD AI V10 — MACHINE REPORT</h1>
  <div class="meta">Generated: ${r.generatedAt}<br>Machine: ${r.machine}</div>
  <h2>Live Snapshot</h2>
  <div>
    <span class="kpi"><b>Temperature:</b> ${r.snapshot.temp.toFixed(1)} °C</span>
    <span class="kpi"><b>Vib Count:</b> ${r.snapshot.vibCnt}</span>
    <span class="kpi"><b>Vib Rate:</b> ${r.snapshot.vibR.toFixed(2)}/s</span>
    <span class="kpi"><b>Current:</b> ${r.snapshot.curA}</span>
    <span class="kpi"><b>Power:</b> ${r.snapshot.pwrKw.toFixed(2)}/s</span>
    <span class="kpi"><b>Health:</b> ${r.snapshot.health.toFixed(0)} %</span>
    <span class="kpi"><b>Efficiency:</b> ${r.snapshot.eff.toFixed(0)} %</span>
    <span class="kpi"><b>Status:</b> ${r.snapshot.status}</span>
  </div>
  <div class="footer">© MECHGUARD AI V10 · Smart Industrial IoT Dashboard · Auto-Generated Report</div>
  <script>window.print&&setTimeout(()=>window.print(),500);<\/script>
  </body></html>`;
  downloadFile(`MECHGUARD_Report_${Date.now()}.html`,html,'text/html');
}

function generateExcelReport(){
  const r=buildReportContent();
  const rows=[
    ['MECHGUARD AI V10 MACHINE REPORT'],
    ['Generated',r.generatedAt],
    ['Machine',r.machine],
    [],
    ['LIVE SNAPSHOT'],
    ['Temperature (°C)',r.snapshot.temp.toFixed(1)],
    ['Vib Count',r.snapshot.vibCnt],
    ['Vib Rate (/s)',r.snapshot.vibR.toFixed(2)],
    ['Current',r.snapshot.curA],
    ['Power (/s)',r.snapshot.pwrKw.toFixed(2)],
    ['Health (%)',r.snapshot.health.toFixed(0)],
    ['Efficiency (%)',r.snapshot.eff.toFixed(0)],
    ['Status',r.snapshot.status]
  ];
  const csv=rows.map(r=>r.map(c=>{const v=String(c==null?'':c);return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;}).join(',')).join('\n');
  downloadFile(`MECHGUARD_Report_${Date.now()}.csv`,csv,'text/csv');
}

function showProgress(label, onDone){
  const wrap=document.getElementById('rpProgressWrap'),fill=document.getElementById('rpProgressFill'),lbl=document.getElementById('rpProgressLbl');
  wrap.classList.add('active'); lbl.textContent=label; fill.style.width='0%';
  let p=0; const t=setInterval(()=>{p+=Math.random()*18+6; if(p>=100){p=100; clearInterval(t); fill.style.width='100%'; setTimeout(()=>{wrap.classList.remove('active'); onDone&&onDone();},350);} else fill.style.width=p+'%';},120);
}

function addReportToHistory(type,filename){
  const arr=loadReportHistory();
  arr.push({t:nowStamp(),type,filename});
  saveReportHistory(arr);
  renderReportHistory();
  setRpStatus('REPORT GENERATED','#22d87a');
}

function setRpStatus(txt,color){
  const el=document.getElementById('rpStatusText'); if(el) el.textContent=txt;
  const dot=document.querySelector('#rpStatus .rp-dot'); if(dot){ dot.style.background=color; dot.style.boxShadow='0 0 8px '+color; }
  const status=document.getElementById('rpStatus'); if(status){ status.style.color=color; status.style.borderColor=color+'55'; status.style.background=color+'1a'; }
}

function downloadReport(type){
  setRpStatus('GENERATING '+type.toUpperCase(),'#ffb84d');
  showProgress(`⏳ Building ${type.toUpperCase()} report...`,()=>{
    const fname=`MECHGUARD_${type.toUpperCase()}_${Date.now()}`;
    if(type==='pdf') generatePDFReport(); else generateExcelReport();
    addReportToHistory(type,fname);
  });
}

function generateSmartReport(){
  setRpStatus('SMART ANALYSIS RUNNING','#9b6dff');
  showProgress('🧠 Smart machine analytics in progress...',()=>{
    generatePDFReport(); generateExcelReport();
    addReportToHistory('pdf','SMART_PDF_'+Date.now());
    addReportToHistory('xlsx','SMART_XLSX_'+Date.now());
  });
}

function clearReportHistory(){
  if(!confirm('Clear all report history?')) return;
  localStorage.removeItem(LS_REPORT_HIST);
  renderReportHistory();
  setRpStatus('HISTORY CLEARED','#ffb300');
}

function renderReportHistory(){
  const arr=loadReportHistory().slice().reverse();
  const el=document.getElementById('rpHistoryList');
  if(!el) return;
  setText('rpTotalReports',arr.length);
  if(arr.length===0){ el.innerHTML='<div class="rp-hist-item" style="justify-content:center;"><span style="color:#4a6280;font-style:italic;">No reports yet</span></div>'; setText('rpLastReport','—'); setText('rpLastReportSub','No reports yet'); return; }
  setText('rpLastReport',fmtTime(arr[0].t));
  setText('rpLastReportSub',fmtFullDate(arr[0].t));
  el.innerHTML=arr.slice(0,12).map((r,i)=>{
    const icon=r.type==='pdf'?'📄':r.type==='xlsx'?'📊':'📤';
    return `<div class="rp-hist-item"><span class="rp-hist-icon">${icon}</span>
      <div><div>${r.filename}</div><div class="rp-hist-meta">${fmtFullDate(r.t)} · ${fmtTime(r.t)}</div></div>
      <span class="rp-hist-tag ${r.type}">${r.type.toUpperCase()}</span>
      <span class="rp-hist-meta">#${arr.length-i}</span></div>`;
  }).join('');
}

/* Init on dashboard load */
const _origInit=initDashboard;
initDashboard=function(){
  _origInit();
  renderReportHistory();
  // Daily auto report at 23:55
  setInterval(()=>{ const d=new Date(); if(d.getHours()===23&&d.getMinutes()===55){ const last=localStorage.getItem('mechguard_daily_auto'); const today=d.toDateString(); if(last!==today){ localStorage.setItem('mechguard_daily_auto',today); generateExcelReport(); addReportToHistory('xlsx','DAILY_AUTO_'+Date.now()); } } },30000);
  // Show sidebar toggle button when dashboard is active
  document.getElementById('sbToggleBtn').classList.add('visible');
  // Restore sound preference
  const savedSound=localStorage.getItem('mechguard_sound');
  if(savedSound==='off') setSoundEnabled(false);
  // Load all settings from storage
  loadSettingsFromStorage();
  // Set dashboard section visible by default
  sbNavigate('dashboard', true);
};

/* ══════════════════════════════════════════
   SIDEBAR NAVIGATION SYSTEM
══════════════════════════════════════════ */

let sbCurrentSection = 'dashboard';
const sbSections = {
  dashboard: ['kpi-row','ai-panel','bottom-row'],
  monitoring: ['kpi-row','ai-panel','bottom-row'],
  reports: ['reportCenter'],
  alerts: ['kpi-row','bottom-row'],
  settings: ['esp-banner']
};

function openSidebar(){
  document.getElementById('mgSidebar').classList.add('sb-open');
  document.getElementById('sbOverlay').classList.add('sb-open');
  if(window.innerWidth > 768){
    document.getElementById('dashPage').classList.add('sb-shifted');
  }
}

function closeSidebar(){
  document.getElementById('mgSidebar').classList.remove('sb-open');
  document.getElementById('sbOverlay').classList.remove('sb-open');
  document.getElementById('dashPage').classList.remove('sb-shifted');
}

function toggleSidebar(){
  const sb = document.getElementById('mgSidebar');
  if(sb.classList.contains('sb-open')) closeSidebar();
  else openSidebar();
}

/* Navigate to a section */
function sbNavigate(section, silent){
  sbCurrentSection = section;

  // Highlight active nav item
  document.querySelectorAll('.sb-item[id^="sbNav-"]').forEach(el=>{
    el.classList.remove('sb-active');
  });
  const activeBtn = document.getElementById('sbNav-'+section);
  if(activeBtn) activeBtn.classList.add('sb-active');

  // All toggleable section ids
  const allIds = ['kpi-row','ai-panel','bottom-row','reportCenter','esp-banner','settingsPanel'];

  // Which elements to show for each section
  const showMap = {
    dashboard: ['kpi-row','ai-panel','bottom-row','esp-banner'],
    monitoring: ['kpi-row','ai-panel','bottom-row','esp-banner'],
    reports:    ['reportCenter'],
    alerts:     ['kpi-row','bottom-row','esp-banner'],
    settings:   ['settingsPanel','esp-banner']
  };
  const show = showMap[section] || showMap.dashboard;

  allIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.style.display = show.includes(id) ? '' : 'none';
  });

  // Scroll top
  if(!silent) window.scrollTo({top:0, behavior:'smooth'});

  // Auto-close sidebar on mobile
  if(!silent && window.innerWidth <= 768) closeSidebar();
}

/* ══════════════════════════════════════════
   INBUILT SOUND ALERT SYSTEM
══════════════════════════════════════════ */
let soundEnabled = true;
let audioCtx = null;
let masterVolume = 0.80;   // 0.0 – 1.0, default 80%
let repeatInterval = 3000; // ms between repeats
let soundWave = 'harsh';   // 'harsh' | 'classic' | 'beep' | 'siren'
const alertTypeEnabled = { temp: true, vib: true };

/* Dynamic thresholds (can be changed from settings) */
let thresholds = { temp: 50, vib: 5 };

function getAudioCtx(){
  if(!audioCtx || audioCtx.state === 'closed'){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ── Master chain: DynamicsCompressor → Gain → destination ── */
function getMasterChain(ctx){
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const gain = ctx.createGain();
  gain.gain.value = Math.min(1.5, masterVolume * 1.5); // boost up to 150%
  comp.connect(gain);
  gain.connect(ctx.destination);
  return comp; // connect oscillators to comp
}

/* ── HARSH MODE: multi-layer distorted alarm ── */
function playHarsh(ctx, type, now){
  const chain = getMasterChain(ctx);

  const configs = {
    temp: [
      // Layer 1: sharp sawtooth warble
      { type:'sawtooth', freqs:[960,720,960,720,960], times:[0,.12,.24,.36,.48], gain:0.9, dur:0.7 },
      // Layer 2: sub bass thud
      { type:'sine', freqs:[120,80], times:[0,.15], gain:0.5, dur:0.3 },
      // Layer 3: high screech
      { type:'sawtooth', freqs:[1400,1100], times:[0,.2], gain:0.4, dur:0.5 },
    ],
    vib: [
      // Layer 1: deep square pulse
      { type:'square', freqs:[180,140,180,140], times:[0,.15,.30,.45], gain:0.9, dur:0.7 },
      // Layer 2: mid crunch
      { type:'sawtooth', freqs:[360,280], times:[0,.2], gain:0.5, dur:0.5 },
      // Layer 3: rumble
      { type:'sine', freqs:[80,60], times:[0,.25], gain:0.4, dur:0.4 },
    ],
  };

  (configs[type] || configs.temp).forEach(layer => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    // Waveshaper distortion for harshness
    const ws = ctx.createWaveShaper();
    ws.curve = makeDistCurve(220);
    ws.oversample = '4x';

    osc.connect(ws);
    ws.connect(g);
    g.connect(chain);
    osc.type = layer.type;

    layer.freqs.forEach((f,i) => osc.frequency.setValueAtTime(f, now + (layer.times[i]||0)));
    g.gain.setValueAtTime(layer.gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + layer.dur);
    osc.start(now);
    osc.stop(now + layer.dur + 0.05);
  });
}

/* ── CLASSIC MODE: clean beep alarm ── */
function playClassic(ctx, type, now){
  const chain = getMasterChain(ctx);
  const map = {
    temp: [{f:880,t:0},{f:660,t:.15},{f:880,t:.30},{f:660,t:.45}],
    vib:  [{f:440,t:0},{f:330,t:.18},{f:440,t:.36}],
  };
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(chain);
  osc.type = 'sine';
  (map[type]||map.temp).forEach(p => osc.frequency.setValueAtTime(p.f, now+p.t));
  g.gain.setValueAtTime(0.9, now);
  g.gain.exponentialRampToValueAtTime(0.001, now+0.75);
  osc.start(now); osc.stop(now+0.8);
}

/* ── BEEP MODE: digital beeps ── */
function playBeep(ctx, type, now){
  const chain = getMasterChain(ctx);
  const pitches = { temp:[1200,1200,1200], vib:[600,600,600] };
  const pts = pitches[type]||pitches.temp;
  pts.forEach((f,i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(chain);
    osc.type = 'square';
    osc.frequency.value = f;
    const t0 = now + i*0.22;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.8, t0+0.02);
    g.gain.linearRampToValueAtTime(0.001, t0+0.18);
    osc.start(t0); osc.stop(t0+0.2);
  });
}

/* ── SIREN MODE: rising/falling wail ── */
function playSiren(ctx, type, now){
  const chain = getMasterChain(ctx);
  const map = { temp:[600,1200], vib:[200,500] };
  const [lo,hi] = map[type]||map.temp;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(chain);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(lo, now);
  osc.frequency.linearRampToValueAtTime(hi, now+0.4);
  osc.frequency.linearRampToValueAtTime(lo, now+0.8);
  g.gain.setValueAtTime(0.9, now);
  g.gain.exponentialRampToValueAtTime(0.001, now+0.9);
  osc.start(now); osc.stop(now+0.95);
}

/* Waveshaper distortion curve */
function makeDistCurve(amount){
  const n=256, c=new Float32Array(n);
  for(let i=0;i<n;i++){
    const x=i*2/n-1;
    c[i]=((Math.PI+amount)*x)/(Math.PI+amount*Math.abs(x));
  }
  return c;
}

/* ── Main playTone dispatcher ── */
function playTone(type){
  if(!soundEnabled) return;
  if(!alertTypeEnabled[type]) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    if(soundWave==='harsh')   playHarsh(ctx, type, now);
    else if(soundWave==='classic') playClassic(ctx, type, now);
    else if(soundWave==='beep')    playBeep(ctx, type, now);
    else if(soundWave==='siren')   playSiren(ctx, type, now);
    // Animate waveform preview bars in settings
    animateWavePreview(type);
  } catch(e){ console.warn('Audio error:', e); }
}

/* ── Waveform preview animation ── */
function animateWavePreview(type){
  const el = document.getElementById('stgWavePreview');
  if(!el) return;
  const colors = { temp:'#f5820a', vib:'#3b9eff' };
  const col = colors[type]||'#00d4ff';
  el.innerHTML = '';
  const bars = 40;
  for(let i=0;i<bars;i++){
    const b = document.createElement('div');
    const h = Math.random()*28+4;
    b.style.cssText = `width:4px;height:${h}px;background:${col};border-radius:2px;opacity:${0.4+Math.random()*0.6};transition:height .1s;`;
    el.appendChild(b);
  }
  // Animate for 1 second
  let ticks = 0;
  const iv = setInterval(()=>{
    el.querySelectorAll('div').forEach(b=>{
      const h = Math.random()*28+4;
      b.style.height = h+'px';
      b.style.opacity = 0.4+Math.random()*0.6;
    });
    if(++ticks > 8){ clearInterval(iv); setTimeout(()=>{ if(el) el.innerHTML='<span style="font-family:\'Share Tech Mono\',monospace;font-size:.6rem;color:#2a3045;">— Play a test to see waveform —</span>'; },200); }
  }, 100);
}

/* Alert state tracking — prevents repeated sounds */
const alertState = { temp: false, vib: false };
let alertSoundTimers = { temp: null, vib: null };
let alertBadgeTimer = null;

function triggerSoundAlert(type, msg){
  if(!soundEnabled) return;
  if(!alertTypeEnabled[type]) return;
  if(alertState[type]) return; // already alerting

  alertState[type] = true;

  // Play sound immediately
  playTone(type);

  // Repeat sound while alert is active
  alertSoundTimers[type] = setInterval(()=>{
    if(alertState[type] && soundEnabled && alertTypeEnabled[type]) playTone(type);
  }, repeatInterval);

  // Show badge
  showAlertBadge(type, msg);

  // Show alert badge in sidebar
  const sbBadge = document.getElementById('sbAlertBadge');
  if(sbBadge) sbBadge.style.display = 'inline';
}

function clearSoundAlert(type){
  if(!alertState[type]) return;
  alertState[type] = false;
  if(alertSoundTimers[type]){ clearInterval(alertSoundTimers[type]); alertSoundTimers[type]=null; }

  // Hide sidebar badge if no active alerts
  const anyActive = Object.values(alertState).some(v=>v);
  if(!anyActive){
    const sbBadge = document.getElementById('sbAlertBadge');
    if(sbBadge) sbBadge.style.display = 'none';
    hideAlertBadge();
  }
  updateAlertBlinkBar();
}

function updateAlertBlinkBar(){
  const bar = document.getElementById('alertBlinkBar');
  if(!bar) return;
  const {temp, vib} = alertState;
  const count = [temp,vib].filter(Boolean).length;
  bar.className = 'alert-blink-indicator';
  if(count === 0) return;
  if(count > 1) bar.classList.add('multi-alert');
  else if(temp) bar.classList.add('temp-alert');
  else if(vib) bar.classList.add('vib-alert');
}

function showAlertBadge(type, msg){
  const badge = document.getElementById('soundAlertBadge');
  const msgEl = document.getElementById('soundAlertMsg');
  if(!badge || !msgEl) return;
  msgEl.textContent = msg;
  badge.style.borderColor = type==='temp'?'rgba(245,130,10,0.5)':type==='vib'?'rgba(59,158,255,0.5)':'rgba(155,109,255,0.5)';
  badge.classList.add('visible');
  if(alertBadgeTimer) clearTimeout(alertBadgeTimer);
  alertBadgeTimer = setTimeout(hideAlertBadge, 5000);
}

function hideAlertBadge(){
  const badge = document.getElementById('soundAlertBadge');
  if(badge) badge.classList.remove('visible');
}

function setSoundEnabled(val){
  soundEnabled = val;
  // Sidebar footer toggle
  const icon = document.getElementById('sbSoundIcon');
  const label = document.getElementById('sbSoundLabel');
  const pill = document.getElementById('sbTogglePill');
  if(icon) icon.textContent = val ? '🔊' : '🔇';
  if(label){ label.textContent = val ? 'Sound Alerts' : 'Sound Off'; label.className = 'sb-sound-label' + (val?' active':''); }
  if(pill){ if(val) pill.classList.add('on'); else pill.classList.remove('on'); }
  // Settings master button
  const mb = document.getElementById('stgMasterBtn');
  if(mb) mb.textContent = val ? '🔊 ON' : '🔇 OFF';
  try{ localStorage.setItem('mechguard_sound', val?'on':'off'); }catch(e){}
}

function toggleSoundSystem(){
  setSoundEnabled(!soundEnabled);
  if(soundEnabled) playTone('vib'); // confirmation tone
}

/* ── Settings panel JS functions ── */
function onVolumeChange(val){
  masterVolume = val/100;
  const disp = document.getElementById('stgVolDisplay');
  if(disp) disp.textContent = val+'%';
  // Update slider gradient
  const sl = document.getElementById('stgVolSlider');
  if(sl) sl.style.background = `linear-gradient(90deg,#00d4ff ${val}%,#1a2e45 ${val}%)`;
  try{ localStorage.setItem('mechguard_vol', val); }catch(e){}
}

function onRepeatChange(val){
  repeatInterval = val * 1000;
  const disp = document.getElementById('stgRepeatDisplay');
  if(disp) disp.textContent = val+'s';
  const sl = document.getElementById('stgRepeatSlider');
  const pct = (val-1)/9*100;
  if(sl) sl.style.background = `linear-gradient(90deg,#ffb84d ${pct}%,#1a2e45 ${pct}%)`;
  try{ localStorage.setItem('mechguard_repeat', val); }catch(e){}
}

function selectWave(btn){
  soundWave = btn.dataset.wave;
  document.querySelectorAll('.stg-wave-btn').forEach(b=>b.classList.remove('stg-wave-active'));
  btn.classList.add('stg-wave-active');
  try{ localStorage.setItem('mechguard_wave', soundWave); }catch(e){}
  // Play preview
  playTone('temp');
}

function toggleAlertType(type){
  alertTypeEnabled[type] = !alertTypeEnabled[type];
  const tog = document.getElementById('stg'+type.charAt(0).toUpperCase()+type.slice(1)+'Toggle');
  if(tog) tog.dataset.on = alertTypeEnabled[type]?'true':'false';
  try{ localStorage.setItem('mechguard_alert_'+type, alertTypeEnabled[type]?'1':'0'); }catch(e){}
}

function testAllSounds(){
  ['temp','vib'].forEach((t,i)=> setTimeout(()=>playTone(t), i*900));
}

function saveThresholds(){
  const t = parseFloat(document.getElementById('threshTemp')?.value)||50;
  const v = parseFloat(document.getElementById('threshVib')?.value)||5;
  thresholds.temp = t;
  thresholds.vib = v;
  try{ localStorage.setItem('mechguard_thresh', JSON.stringify(thresholds)); }catch(e){}
}

function loadSettingsFromStorage(){
  try{
    const vol = localStorage.getItem('mechguard_vol');
    if(vol){ onVolumeChange(parseInt(vol)); const sl=document.getElementById('stgVolSlider'); if(sl) sl.value=vol; }
    const rep = localStorage.getItem('mechguard_repeat');
    if(rep){ onRepeatChange(parseInt(rep)); const sl=document.getElementById('stgRepeatSlider'); if(sl) sl.value=rep; }
    const wave = localStorage.getItem('mechguard_wave');
    if(wave){ soundWave=wave; document.querySelectorAll('.stg-wave-btn').forEach(b=>{ b.classList.toggle('stg-wave-active', b.dataset.wave===wave); }); }
    ['temp','vib'].forEach(t=>{
      const v=localStorage.getItem('mechguard_alert_'+t);
      if(v!==null){ alertTypeEnabled[t]=v==='1'; const tog=document.getElementById('stg'+t.charAt(0).toUpperCase()+t.slice(1)+'Toggle'); if(tog) tog.dataset.on=alertTypeEnabled[t]?'true':'false'; }
    });
    const thr = localStorage.getItem('mechguard_thresh');
    if(thr){ const p=JSON.parse(thr); Object.assign(thresholds,p); const te=document.getElementById('threshTemp'); if(te) te.value=thresholds.temp; const ve=document.getElementById('threshVib'); if(ve) ve.value=thresholds.vib; }
  }catch(e){}
}

/* Hook into applyData to check thresholds */
const _origApplyForAlerts = applyData;
applyData = function(d){
  _origApplyForAlerts(d);

  const temp = parseFloat(d.temperature)||0;
  const vibR = parseFloat(d.vibRate)||0;

  if(temp > thresholds.temp){
    triggerSoundAlert('temp', `Temperature HIGH: ${temp.toFixed(1)}°C — Check cooling system`);
    updateAlertBlinkBar();
  } else {
    clearSoundAlert('temp');
    updateAlertBlinkBar();
  }

  if(vibR > thresholds.vib){
    triggerSoundAlert('vib', `Vibration CRITICAL: ${vibR.toFixed(2)}/s — Inspect machine mounting`);
    updateAlertBlinkBar();
  } else {
    clearSoundAlert('vib');
    updateAlertBlinkBar();
  }

};

/* Keyboard shortcut: Escape to close sidebar */
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape') closeSidebar();
});