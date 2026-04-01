/**
 * Shared formatting helpers used across the dashboard.
 */
var TARGET = 74500;

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

function pill(r) {
  return '<span class="pill ' + r + '">' +
    (r === 'r' ? '🔴 Критично' : r === 'y' ? '🟡 Внимание' : '🟢 Норма') +
    '</span>';
}

function stxt(r) {
  return r === 'r' ? '🔴 Критично' : r === 'y' ? '🟡 Внимание' : '🟢 Норма';
}
