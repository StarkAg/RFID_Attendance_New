// script.js - Dashboard logic
const APPS_SCRIPT_EXEC_URL = "YOUR_EXEC_URL"; // <<-- replace with your /exec URL
const APPS_SCRIPT_DOWNLOAD_URL = APPS_SCRIPT_EXEC_URL + "?download=1";
const APPS_SCRIPT_CLEAR_URL = APPS_SCRIPT_EXEC_URL + "?action=clear&token=qwerty"; // token must match SECRET_TOKEN in Apps Script

const REFRESH_MS = 5000;
let attendanceData = [];
let lastSeenEpoch = 0;
let autoRefreshTimer = null;

function el(id){ return document.getElementById(id); }

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

function fmtTime(epoch){
  if(!epoch) return "";
  return new Date(epoch*1000).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour12:false }).split(', ')[1] || new Date(epoch*1000).toLocaleTimeString();
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

function renderTables(rows){
  const tables = document.getElementById('tables');
  if(!rows || rows.length === 0){
    tables.innerHTML = '<div class="card">No rows yet</div>';
    el('total').textContent = '0';
    el('labCount').textContent = '0';
    return;
  }
  attendanceData = rows.map((r, idx) => ({
    id: idx+1,
    epoch: r.epoch,
    time: r.time || fmtTime(r.epoch),
    Lab: r.Lab || r.lab || 'unknown',
    ra: r.ra,
    last3: r.last3 || (r.ra ? r.ra.slice(-3) : '')
  }));
  el('total').textContent = attendanceData.length;
  const groups = groupByLab(attendanceData);
  el('labCount').textContent = groups.size;

  let out = "";
  for(const [lab, list] of groups){
    out += `<div class="lab-card"><div class="lab-title"><h2>${lab}</h2><div>${list.length} rows</div></div>`;
    out += `<table class="table"><thead><tr><th>#</th><th>Time</th><th>RA</th><th>last3</th></tr></thead><tbody>`;
    for(let i=0;i<list.length;i++){
      const r = list[i];
      out += `<tr data-epoch="${r.epoch}"><td>${i+1}</td><td>${r.time}</td><td>${r.ra}</td><td>${r.last3}</td></tr>`;
    }
    out += `</tbody></table></div>`;
  }
  tables.innerHTML = out;
  highlightNewest();
  el('lastUpdated').textContent = "Updated: " + new Date().toLocaleTimeString();
  el('downloadLink').href = APPS_SCRIPT_DOWNLOAD_URL;
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
    // optional play sound - omitted
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
  el('refreshBtn').addEventListener('click', reloadData);
  el('clearBtn').addEventListener('click', clearLogs);
  reloadData();
  startAutoRefresh();
});