/**
 * Shared formatting helpers used across the dashboard.
 */
var TARGET = 74500;
var TARGET_PRESCHOOL = 88372;
var TARGET_GENERAL = 90814;
var TARGET_ADDITIONAL = 101081;

function fmt(v) {
  return v.toLocaleString('ru-RU') + ' ₽';
}

function fmtK(v) {
  return (v / 1000).toFixed(1) + ' т.₽';
}

function fmtDiff(v) {
  var d = v - TARGET;
  return (d >= 0 ? '+' : '') + (Math.round(d / 100) / 10) + ' т.₽';
}

function fmtPct(v) {
  return v.toFixed(1) + '%';
}

function fmtMln(v) {
  return (v / 1000000).toFixed(1) + ' млн ₽';
}

function fmtMonths(days) {
  return (days / 30).toFixed(1) + ' мес.';
}

function pill(r) {
  return '<span class="pill ' + r + '">' +
    (r === 'r' ? '🔴 Критично' : r === 'y' ? '🟡 Внимание' : '🟢 Норма') +
    '</span>';
}

function stxt(r) {
  return r === 'r' ? '🔴 Критично' : r === 'y' ? '🟡 Внимание' : '🟢 Норма';
}

function colorBuildingLoad(v) {
  return v < 50 ? 'r' : v < 80 ? 'y' : 'g';
}

function colorClassCapacity(v) {
  return v <= 19 ? 'r' : v <= 24 ? 'y' : 'g';
}

function colorTurnover(v) {
  return v <= 7 ? 'g' : v <= 10 ? 'y' : 'r';
}

function colorStaffing(v) {
  return v >= 95 ? 'g' : v >= 85 ? 'y' : 'r';
}

function colorAvgAge(v) {
  return v < 35 ? 'y' : v <= 50 ? 'g' : 'r';
}

function colorExperience(v) {
  return v < 3 ? 'r' : v <= 6 ? 'y' : 'g';
}

function colorVacancy(days) {
  var months = days / 30;
  return months < 1.5 ? 'g' : months <= 2 ? 'y' : 'r';
}

function zoneColor(zone) {
  return zone === 'r' ? '#ef4444' : zone === 'y' ? '#f59e0b' : '#10b981';
}
