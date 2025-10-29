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
  dateFilter: null // null = 'all', otherwise it's a Date object
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

// Helper function to get today's date in IST (Asia/Kolkata)
function getTodayIST(){
  const now = new Date();
  // Convert to IST timezone
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate;
}

// Helper function to add days to a date
function addDays(date, days){
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to format date as YYYY-MM-DD
function formatDateIST(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to format date for display (e.g., "Oct 29, 2025" or "Today")
function formatDateDisplay(date){
  const today = getTodayIST();
  const todayStr = formatDateIST(today);
  const dateStr = formatDateIST(date);
  
  if(dateStr === todayStr){
    return 'Today';
  }
  
  const yesterday = addDays(today, -1);
  const yesterdayStr = formatDateIST(yesterday);
  if(dateStr === yesterdayStr){
    return 'Yesterday';
  }
  
  // Format as "Mon DD, YYYY" (e.g., "Oct 29, 2025")
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  return formatter.format(date);
}

// Helper function to get date string from epoch in IST
function getDateStringIST(epoch){
  const date = new Date(epoch * 1000);
  // Use Intl.DateTimeFormat for reliable IST conversion
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date); // Returns YYYY-MM-DD format
}

// Update date display in UI
function updateDateDisplay(){
  const dateDisplay = el('dateDisplay');
  if(!dateDisplay) return;
  
  if(currentFilters.dateFilter === null){
    dateDisplay.textContent = 'All';
  } else {
    dateDisplay.textContent = formatDateDisplay(currentFilters.dateFilter);
  }
}

// Navigate to previous day
function navigateDatePrev(){
  // Deactivate "All" button if active
  const dateAllBtn = el('dateAll');
  if(dateAllBtn && dateAllBtn.classList.contains('active')){
    dateAllBtn.classList.remove('active');
  }
  
  if(currentFilters.dateFilter === null){
    // If "All" is selected, start from today
    currentFilters.dateFilter = getTodayIST();
  } else {
    currentFilters.dateFilter = addDays(currentFilters.dateFilter, -1);
  }
  updateDateDisplay();
  applyFilters();
}

// Navigate to next day
function navigateDateNext(){
  // Deactivate "All" button if active
  const dateAllBtn = el('dateAll');
  if(dateAllBtn && dateAllBtn.classList.contains('active')){
    dateAllBtn.classList.remove('active');
  }
  
  if(currentFilters.dateFilter === null){
    // If "All" is selected, start from today
    currentFilters.dateFilter = getTodayIST();
  } else {
    currentFilters.dateFilter = addDays(currentFilters.dateFilter, 1);
  }
  updateDateDisplay();
  applyFilters();
}

// Search and filter functions
function applyFilters(){
  const searchTerm = currentFilters.search.toLowerCase().trim();
  const dateFilter = currentFilters.dateFilter;
  
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
    
    // Date filter - filter by selected date or show all
    let matchesDate = true;
    if (dateFilter !== null) {
      const itemDate = getDateStringIST(item.epoch);
      const targetDate = formatDateIST(dateFilter);
      matchesDate = itemDate === targetDate;
    }
    
    return matchesSearch && matchesDate;
  });
  
  // Update total count to reflect filtered data
  updateTotalCount();
  renderFilteredTables();
}

function updateTotalCount(){
  const totalElement = el('total');
  if(filteredData && filteredData.length >= 0){
    totalElement.textContent = filteredData.length;
  }
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
  currentFilters = { search: '', dateFilter: getTodayIST() };
  el('searchInput').value = '';
  
  // Reset date slider to 'today'
  const dateAllBtn = el('dateAll');
  if(dateAllBtn){
    dateAllBtn.classList.remove('active');
  }
  
  updateDateDisplay();
  filteredData = [...attendanceData];
  applyFilters();
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
  
  // Don't set total here - it will be set by applyFilters based on filtered data
  const groups = groupByLab(attendanceData);
  el('labCount').textContent = groups.size;
  
  // Update lab filter dropdown
  updateLabFilter(groups);
  
  // Initialize filtered data
  filteredData = [...attendanceData];
  
  // Apply current filters (this will update the total count)
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
  
  // Initialize date filter to today
  currentFilters.dateFilter = getTodayIST();
  updateDateDisplay();
  
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
  
  // Date filter - All button
  const dateAllBtn = el('dateAll');
  if(dateAllBtn){
    dateAllBtn.addEventListener('click', () => {
      dateAllBtn.classList.toggle('active');
      if(dateAllBtn.classList.contains('active')){
        currentFilters.dateFilter = null; // Show all
      } else {
        currentFilters.dateFilter = getTodayIST(); // Default to today
      }
      updateDateDisplay();
      applyFilters();
    });
  }
  
  // Date navigation arrows
  const datePrevBtn = el('datePrev');
  if(datePrevBtn){
    datePrevBtn.addEventListener('click', navigateDatePrev);
  }
  
  const dateNextBtn = el('dateNext');
  if(dateNextBtn){
    dateNextBtn.addEventListener('click', navigateDateNext);
  }
  
  el('clearFilters').addEventListener('click', clearFilters);
  
  // Initialize
  reloadData();
  startAutoRefresh();
});