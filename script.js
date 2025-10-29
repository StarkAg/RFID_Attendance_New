// script.js - Dashboard logic
const APPS_SCRIPT_EXEC_URL = "https://script.google.com/macros/s/AKfycbx9wyKurtNYarda75iu9L7FZYrR-FcPVbN7Fm_XDYQD50s2PHguPjy-OVSYDmYpf8BLtQ/exec";
const APPS_SCRIPT_DOWNLOAD_URL = APPS_SCRIPT_EXEC_URL + "?download=1";
const APPS_SCRIPT_CLEAR_URL = APPS_SCRIPT_EXEC_URL + "?action=clear&token=qwerty"; // token must match SECRET_TOKEN in Apps Script

const REFRESH_MS = 1000;
let attendanceData = [];
let filteredData = [];
let lastSeenEpoch = 0;
let lastRecordCount = 0;
let autoRefreshTimer = null;
let selectedLab = 'all';
let isDarkMode = false;
let notificationsEnabled = true;
let currentFilters = {
  search: '',
  dateFrom: '',
  dateTo: ''
};

// Theme-aware favicon (SVG data URLs)
const FAVICON_LIGHT = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="12" ry="12" fill="white" stroke="black" stroke-width="4"/><circle cx="28" cy="32" r="6" fill="black"/><path d="M36 28c4 0 8 4 8 8" fill="none" stroke="black" stroke-width="4" stroke-linecap="round"/><path d="M36 22c7 0 14 7 14 14" fill="none" stroke="black" stroke-width="4" stroke-linecap="round"/></svg>';
const FAVICON_DARK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="12" ry="12" fill="black" stroke="white" stroke-width="4"/><circle cx="28" cy="32" r="6" fill="white"/><path d="M36 28c4 0 8 4 8 8" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M36 22c7 0 14 7 14 14" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>';

function applyFavicon(){
  const link = document.getElementById('favicon');
  if(!link) return;
  link.setAttribute('href', isDarkMode ? FAVICON_DARK : FAVICON_LIGHT);
}

function el(id){ return document.getElementById(id); }

// Modern sleek sound notification function
function playNotificationSound(){
  if(!notificationsEnabled) return; // Don't play sound if notifications are disabled
  
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a modern, sleek sound with two oscillators
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    
    const gain1 = audioContext.createGain();
    const gain2 = audioContext.createGain();
    const masterGain = audioContext.createGain();
    
    // Create a high-pass filter for modern clarity
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, audioContext.currentTime);
    filter.Q.setValueAtTime(0.5, audioContext.currentTime);
    
    // Connect the audio graph
    osc1.connect(gain1);
    osc2.connect(gain2);
    
    gain1.connect(filter);
    gain2.connect(filter);
    
    filter.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    
    // Primary oscillator - clean modern tone
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1000, now);
    osc1.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    
    // Secondary oscillator - subtle harmonic
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2000, now);
    osc2.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
    
    // Clean gain envelopes
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    // Master gain control
    masterGain.gain.setValueAtTime(0.5, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    // Start oscillators
    osc1.start(now);
    osc2.start(now);
    
    // Stop oscillators
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
    
  } catch(e) {
    console.log('Audio not supported:', e);
  }
}

// Notification toggle function
function toggleNotifications(){
  notificationsEnabled = !notificationsEnabled;
  
  const notifyToggle = el('notifyToggle');
  const notifyOnIcon = el('notifyOnIcon');
  const notifyOffIcon = el('notifyOffIcon');
  
  if(notificationsEnabled){
    notifyToggle.classList.add('active');
    notifyOnIcon.style.display = 'block';
    notifyOffIcon.style.display = 'none';
    // Play test sound when enabling notifications
    playNotificationSound();
  } else {
    notifyToggle.classList.remove('active');
    notifyOnIcon.style.display = 'none';
    notifyOffIcon.style.display = 'block';
  }
  
  // Save notification preference
  localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
}

function initNotifications(){
  // Load saved notification preference
  const savedNotifications = localStorage.getItem('notificationsEnabled');
  notificationsEnabled = savedNotifications ? savedNotifications === 'true' : true;
  
  const notifyToggle = el('notifyToggle');
  const notifyOnIcon = el('notifyOnIcon');
  const notifyOffIcon = el('notifyOffIcon');
  
  if(notificationsEnabled){
    notifyToggle.classList.add('active');
    notifyOnIcon.style.display = 'block';
    notifyOffIcon.style.display = 'none';
  } else {
    notifyToggle.classList.remove('active');
    notifyOnIcon.style.display = 'none';
    notifyOffIcon.style.display = 'block';
  }
}

// Search and filter functions
function applyFilters(){
  const searchTerm = currentFilters.search.toLowerCase().trim();
  const dateFrom = currentFilters.dateFrom;
  const dateTo = currentFilters.dateTo;
  
  filteredData = attendanceData.filter(item => {
    // Search filter - improved RA number matching
    let matchesSearch = true;
    if (searchTerm) {
      const raString = item.ra.toString().toLowerCase();
      const last3String = item.last3.toString().toLowerCase();
      const labString = item.Lab.toLowerCase();
      
      matchesSearch = raString.includes(searchTerm) ||
                     last3String.includes(searchTerm) ||
                     labString.includes(searchTerm);
    }
    
    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const itemDate = new Date(item.epoch * 1000).toISOString().split('T')[0];
      if (dateFrom && itemDate < dateFrom) matchesDate = false;
      if (dateTo && itemDate > dateTo) matchesDate = false;
    }
    
    return matchesSearch && matchesDate;
  });
  renderFilteredTables();
}

function renderFilteredTables(){
  const tables = document.getElementById('tables');
  if(!filteredData || filteredData.length === 0){
    tables.innerHTML = '<div class="card empty-state"><div class="empty-icon">🔍</div><div class="empty-text">No records found matching your search</div></div>';
    return;
  }
  
  const groups = groupByLab(filteredData);
  const filteredGroups = selectedLab === 'all' ? groups : new Map([[selectedLab, groups.get(selectedLab) || []]]);
  
  let out = "";
  for(const [lab, list] of filteredGroups){
    if(list.length === 0) continue;
    
    out += `<div class="lab-card" data-lab="${lab}">
      <div class="lab-header">
        <div class="lab-info">
          <h2 class="lab-name">${lab}</h2>
          <span class="lab-count">${list.length} records</span>
        </div>
        <div class="lab-status">
          <span class="status-indicator active"></span>
          <span class="status-text">Active</span>
        </div>
      </div>
      <div class="table-container">
        <table class="attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Time (IST)</th>
              <th>RA Number</th>
              <th>Last 3</th>
            </tr>
          </thead>
          <tbody>`;
    
    for(let i=0;i<list.length;i++){
      const r = list[i];
      out += `<tr data-epoch="${r.epoch}" class="attendance-row">
        <td class="row-number">${i+1}</td>
        <td class="date-cell">${r.date}</td>
        <td class="time-cell">${r.time}</td>
        <td class="ra-cell">${r.ra}</td>
        <td class="last3-cell">${r.last3}</td>
      </tr>`;
    }
    
    out += `</tbody></table></div></div>`;
  }
  
  tables.innerHTML = out;
}

function clearFilters(){
  currentFilters = { search: '', dateFrom: '', dateTo: '' };
  el('searchInput').value = '';
  el('dateFrom').value = '';
  el('dateTo').value = '';
  filteredData = [...attendanceData];
  renderFilteredTables();
}

function showAnalyticsDashboard(){
  alert('Analytics Dashboard\n\nThis feature will show:\n• Attendance trends and charts\n• Peak hours analysis\n• Lab utilization metrics\n• Student attendance patterns\n\nComing soon!');
}

function showStudentManagement(){
  alert('Student Management System\n\nThis feature will include:\n• Student profiles and history\n• Attendance tracking per student\n• Absence alerts and reports\n• Student performance analytics\n\nComing soon!');
}

function toggleTheme(){
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-theme', isDarkMode);
  
  // Update theme toggle icons
  const sunIcon = el('sunIcon');
  const moonIcon = el('moonIcon');
  
  if(isDarkMode){
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
  
  // Save theme preference
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  applyFavicon();
}

function initTheme(){
  // Load saved theme or detect system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  isDarkMode = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
  
  if(isDarkMode){
    document.body.classList.add('dark-theme');
    el('sunIcon').style.display = 'none';
    el('moonIcon').style.display = 'block';
  } else {
    el('sunIcon').style.display = 'block';
    el('moonIcon').style.display = 'none';
  }
  applyFavicon();
}

async function fetchRowsFromServer(){
  try{
    const res = await fetch(APPS_SCRIPT_EXEC_URL, {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch(e){
    console.error("fetchRowsFromServer:", e);
    return null;
  }
}

function fmtDate(epoch){
  if(!epoch) return "";
  const date = new Date(epoch*1000);
  return date.toLocaleDateString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function fmtTime(epoch){
  if(!epoch) return "";
  const date = new Date(epoch*1000);
  return date.toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata', 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function groupByLab(rows){
  const map = new Map();
  for(const r of rows){
    const lab = r.Lab || r.lab || "unknown";
    if(!map.has(lab)) map.set(lab, []);
    map.get(lab).push(r);
  }
  return map;
}

function updateLabFilter(groups){
  const labFilter = el('labFilter');
  const currentValue = labFilter.value;
  
  // Clear existing options except "All Labs"
  labFilter.innerHTML = '<option value="all">All Labs</option>';
  
  // Add lab options
  for(const [lab] of groups){
    const option = document.createElement('option');
    option.value = lab;
    option.textContent = lab;
    labFilter.appendChild(option);
  }
  
  // Restore selection if it still exists
  if(groups.has(currentValue)){
    labFilter.value = currentValue;
    selectedLab = currentValue;
  } else {
    selectedLab = 'all';
  }
}

function renderTables(rows){
  const tables = document.getElementById('tables');
  if(!rows || rows.length === 0){
    tables.innerHTML = '<div class="card empty-state"><div class="empty-icon">📊</div><div class="empty-text">No attendance records yet</div></div>';
    el('total').textContent = '0';
    el('labCount').textContent = '0';
    return;
  }
  
  attendanceData = rows.map((r, idx) => ({
    id: idx+1,
    epoch: r.epoch,
    date: fmtDate(r.epoch),
    time: fmtTime(r.epoch),
    Lab: r.Lab || r.lab || 'unknown',
    ra: r.ra,
    last3: r.last3 || (r.ra ? r.ra.slice(-3) : '')
  }));
  
  // Check if new entries were added
  const currentCount = attendanceData.length;
  if (currentCount > lastRecordCount && lastRecordCount > 0) {
    // New entries detected - play sound
    playNotificationSound();
  }
  lastRecordCount = currentCount;
  
  el('total').textContent = attendanceData.length;
  const groups = groupByLab(attendanceData);
  el('labCount').textContent = groups.size;
  
  // Update lab filter dropdown
  updateLabFilter(groups);
  
  // Initialize filtered data
  filteredData = [...attendanceData];
  
  // Apply current filters
  applyFilters();
  
  highlightNewest();
  el('lastUpdated').textContent = "Updated: " + new Date().toLocaleTimeString();
}

function highlightNewest(){
  const newest = Math.max(...attendanceData.map(r => r.epoch || 0), 0);
  if (newest > lastSeenEpoch) {
    lastSeenEpoch = newest;
    // add class to the row(s) with matching epoch
    const rows = document.querySelectorAll(`[data-epoch="${newest}"]`);
    rows.forEach(tr => {
      tr.classList.add('new-row');
      setTimeout(()=>tr.classList.remove('new-row'), 2500);
    });
    // Play notification sound for new entries
    playNotificationSound();
  }
}

async function reloadData(){
  const rows = await fetchRowsFromServer();
  if(!rows) {
    console.warn("No rows fetched");
    return;
  }
  renderTables(rows);
}

function downloadCSV(){
  if(!attendanceData || attendanceData.length === 0){
    alert('No data to download');
    return;
  }
  
  // Create CSV content
  const headers = ['#', 'Date', 'Time (IST)', 'Lab', 'RA Number', 'Last 3'];
  const csvContent = [
    headers.join(','),
    ...attendanceData.map(row => [
      row.id,
      `"${row.date}"`,
      `"${row.time}"`,
      `"${row.Lab}"`,
      row.ra,
      row.last3
    ].join(','))
  ].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function startAutoRefresh(){
  if(autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(reloadData, REFRESH_MS);
}
function stopAutoRefresh(){ if(autoRefreshTimer) clearInterval(autoRefreshTimer); autoRefreshTimer = null; }

async function clearLogs(){
  if(!confirm("Clear all logs? This is irreversible.")) return;
  try{
    const res = await fetch(APPS_SCRIPT_CLEAR_URL);
    const j = await res.json();
    if(j.status === 'ok') { alert('Cleared.'); reloadData(); }
    else alert('Clear failed: ' + (j.msg||JSON.stringify(j)));
  } catch(e){ alert('Clear failed: '+e.message); }
}

document.addEventListener('DOMContentLoaded', ()=> {
  initTheme();
  initNotifications();
  
  // Basic controls
  el('refreshBtn').addEventListener('click', reloadData);
  el('clearBtn').addEventListener('click', clearLogs);
  el('themeToggle').addEventListener('click', toggleTheme);
  el('notifyToggle').addEventListener('click', toggleNotifications);
  
  // Download and new buttons
  el('downloadLink').addEventListener('click', (e) => {
    e.preventDefault();
    downloadCSV();
  });
  el('analyticsBtn').addEventListener('click', showAnalyticsDashboard);
  el('studentMgmtBtn').addEventListener('click', showStudentManagement);
  
  // Lab filter
  el('labFilter').addEventListener('change', (e) => {
    selectedLab = e.target.value;
    applyFilters();
  });
  
  // Search functionality
  el('searchInput').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    applyFilters();
  });
  
  el('clearSearch').addEventListener('click', () => {
    el('searchInput').value = '';
    currentFilters.search = '';
    applyFilters();
  });
  
  // Date filters
  el('dateFrom').addEventListener('change', (e) => {
    currentFilters.dateFrom = e.target.value;
  });
  
  el('dateTo').addEventListener('change', (e) => {
    currentFilters.dateTo = e.target.value;
  });
  
  el('applyFilters').addEventListener('click', applyFilters);
  el('clearFilters').addEventListener('click', clearFilters);
  
  // Initialize
  reloadData();
  startAutoRefresh();
});