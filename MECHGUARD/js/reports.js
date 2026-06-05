/* MECHGUARD — Reports module provides CSV/PDF export, summary creation, and report UI utilities */

function buildReportSummary(sensorData, meta) {
  return {
    generatedAt: new Date().toLocaleString(),
    status: sensorData.machineStatus || 'UNKNOWN',
    temperature: `${sensorData.temp.toFixed(1)} °C`,
    vibrationRate: `${sensorData.vibRate.toFixed(2)} /s`,
    current: `${sensorData.currentAmps.toFixed(1)} A`,
    power: `${sensorData.powerKw.toFixed(2)} kW`,
    health: `${sensorData.health.toFixed(0)}%`,
    efficiency: `${sensorData.efficiency.toFixed(0)}%`,
    uptime: `${sensorData.uptime || 0} mins`,
    notes: meta && meta.notes ? meta.notes : 'No issues detected'
  };
}

function createCsvData(sensorData, meta) {
  const rows = [
    ['Timestamp', new Date().toISOString()],
    ['Status', sensorData.machineStatus || 'UNKNOWN'],
    ['Temperature (°C)', sensorData.temp.toFixed(1)],
    ['Vibration Rate (/s)', sensorData.vibRate.toFixed(2)],
    ['Current (A)', sensorData.currentAmps.toFixed(1)],
    ['Power (kW)', sensorData.powerKw.toFixed(2)],
    ['Health (%)', sensorData.health.toFixed(0)],
    ['Efficiency (%)', sensorData.efficiency.toFixed(0)],
    ['Uptime (mins)', sensorData.uptime || 0],
    ['Punch Count', sensorData.vibCount || sensorData.punchCount || 0],
    ['Notes', meta && meta.notes ? meta.notes : 'No issues detected']
  ];
  return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCsvReport(sensorData, meta) {
  const csv = createCsvData(sensorData, meta);
  downloadCsv('mechguard_report_' + new Date().toISOString().replace(/[:\.]/g, '-') + '.csv', csv);
}

function exportSummaryPdf(sensorData, meta) {
  const lines = [
    'MECHGUARD PDF REPORT',
    'Generated: ' + new Date().toLocaleString(),
    'Machine Status: ' + (sensorData.machineStatus || 'UNKNOWN'),
    'Temperature: ' + sensorData.temp.toFixed(1) + ' °C',
    'Vibration Rate: ' + sensorData.vibRate.toFixed(2) + ' /s',
    'Current: ' + sensorData.currentAmps.toFixed(1) + ' A',
    'Power: ' + sensorData.powerKw.toFixed(2) + ' kW',
    'Health: ' + sensorData.health.toFixed(0) + '%',
    'Efficiency: ' + sensorData.efficiency.toFixed(0) + '%',
    'Uptime (mins): ' + (sensorData.uptime || 0),
    'Notes: ' + (meta && meta.notes ? meta.notes : 'No issues detected')
  ];
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mechguard_report_' + new Date().toISOString().replace(/[:\.]/g, '-') + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setReportSummary(reportId, sensorData, meta) {
  const container = document.getElementById(reportId);
  if (!container) return;
  const summary = buildReportSummary(sensorData, meta);
  container.innerHTML = Object.entries(summary).map(([key, value]) => `
    <div class="report-row"><span class="report-cell-label">${key}</span><span class="report-cell-value">${value}</span></div>
  `).join('');
}

function setupReportButtons(state) {
  const csvButton = document.getElementById('btnExportCsv');
  const pdfButton = document.getElementById('btnExportPdf');
  const noteInput = document.getElementById('reportNotes');
  if (csvButton) csvButton.addEventListener('click', () => exportCsvReport(state.sensorData, { notes: noteInput ? noteInput.value : '' }));
  if (pdfButton) pdfButton.addEventListener('click', () => exportSummaryPdf(state.sensorData, { notes: noteInput ? noteInput.value : '' }));
}
