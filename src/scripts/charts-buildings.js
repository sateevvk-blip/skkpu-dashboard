/**
 * charts-buildings.js — графики зданий и наполняемости классов.
 *
 * Логика из patch-stage2-charts-bld.js поглощена здесь.
 * Данные читаются из AppState.
 *
 * FIX (Issue #12):
 * - Добавлена renderMoBldKinder() — дошкольные группы и наполняемость (ch-bldKinder, ch-bldKinderCap).
 * - Вызов renderMoBldKinder() добавлен в конец renderMoBld().
 */

function renderMoBld() {
  const GEO       = AppState.get('geo');
  const DISTRICTS = AppState.get('districts');
  const feats     = GEO.features;
  const dKeys     = Object.keys(DISTRICTS);

  function dName(k)  { return (DISTRICTS[k] && DISTRICTS[k].shortName) || k; }
  function dLabel(f) { return f.properties.name_clean || f.properties.name; }
  function bldD(p) {
    return {
      buildingLoad: p.buildingLoad || (40 + Math.random() * 55),
      buildings:    p.buildings    || Math.round(5 + Math.random() * 40)
    };
  }

  // ch-bldCount: Top-10 по количеству зданий
  const bldRows = feats.map(function (f) { return { name: dLabel(f), count: Math.round(bldD(f.properties).buildings) }; });
  bldRows.sort(function (a, b) { return b.count - a.count; });
  const top10 = bldRows.slice(0, 10);
  const eBldC = document.getElementById('ch-bldCount');
  if (eBldC) {
    if (!eBldC._ec) eBldC._ec = echarts.init(eBldC);
    eBldC._ec.setOption({
      tooltip: { trigger: 'axis' }, grid: { top: 8, right: 60, bottom: 8, left: 150 },
      xAxis: { type: 'value', name: 'корпусов' },
      yAxis: { type: 'category', data: top10.map(function (r) { return r.name; }), axisLabel: { fontSize: 10 } },
      series: [{ type: 'bar', data: top10.map(function (r) { return r.count; }), itemStyle: { color: '#2563eb' },
        label: { show: true, position: 'right', fontSize: 10 } }]
    }, true);
  }

  // ch-bldLoad: Top-12 с наименьшей загрузкой
  const loadRows = feats.map(function (f) { return { name: dLabel(f), load: Math.round(bldD(f.properties).buildingLoad) }; });
  loadRows.sort(function (a, b) { return a.load - b.load; });
  const top12 = loadRows.slice(0, 12);
  const eBldL = document.getElementById('ch-bldLoad');
  if (eBldL) {
    if (!eBldL._ec) eBldL._ec = echarts.init(eBldL);
    eBldL._ec.setOption({
      tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 150 },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: top12.map(function (r) { return r.name; }), axisLabel: { fontSize: 10 }, inverse: true },
      series: [{ type: 'bar', data: top12.map(function (r) {
        return { value: r.load, itemStyle: { color: r.load < 50 ? '#ef4444' : r.load < 80 ? '#f59e0b' : '#10b981' } };
      }), label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 } }]
    }, true);
  }

  // ch-bldClasses / ch-classSize: наполняемость классов с выбором округа
  const grades = ['1','2','3','4','5','6','7','8','9','10','11'];
  const moAvg = grades.map(function (g) {
    let sum = 0, cnt = 0;
    dKeys.forEach(function (k) { const cs = DISTRICTS[k].classSizes; if (cs && cs[g]) { sum += cs[g]; cnt++; } });
    return cnt ? Math.round(sum / cnt * 10) / 10 : 25;
  });

  const eCS = document.getElementById('ch-bldClasses') || document.getElementById('ch-classSize');
  if (!eCS) return;

  if (!document.getElementById('sel-classSize')) {
    const sel = document.createElement('select');
    sel.id = 'sel-classSize';
    sel.style.cssText = 'font-size:12px;padding:2px 6px;margin-bottom:6px;border:1px solid #d1d5db;border-radius:4px;';
    const o0 = document.createElement('option'); o0.value = '__mo__'; o0.textContent = 'Средняя по МО'; sel.appendChild(o0);
    dKeys.forEach(function (k) { const o = document.createElement('option'); o.value = k; o.textContent = dName(k); sel.appendChild(o); });
    eCS.parentElement.insertBefore(sel, eCS);
    sel.addEventListener('change', function () { drawCS(sel.value); });
  }

  if (!eCS._ec) eCS._ec = echarts.init(eCS);

  function drawCS(key) {
    const isAll = key === '__mo__';
    const vals = isAll ? moAvg : grades.map(function (g) {
      const cs = DISTRICTS[key] && DISTRICTS[key].classSizes;
      return cs && cs[g] ? cs[g] : moAvg[grades.indexOf(g)];
    });
    eCS._ec.setOption({
      tooltip: { trigger: 'axis' }, grid: { top: 24, right: 16, bottom: 32, left: 42 },
      xAxis: { type: 'category', data: grades.map(function (g) { return g + ' кл.'; }), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: 'Уч.', min: 0, max: 35 },
      series: [{ type: 'bar', data: vals.map(function (v) {
        return { value: v, itemStyle: { color: v <= 19 ? '#ef4444' : v <= 24 ? '#f59e0b' : '#10b981' } };
      }), label: { show: true, position: 'top', fontSize: 10 },
      markLine: { silent: true, data: [
        { yAxis: 20, lineStyle: { type: 'dashed', color: '#f59e0b' }, label: { formatter: '20' } },
        { yAxis: 25, lineStyle: { type: 'dashed', color: '#10b981' }, label: { formatter: '25' } }
      ] } }]
    }, true);
  }
  drawCS('__mo__');

  // FIX #12: рендер дошкольных графиков
  renderMoBldKinder();
}

// ════════════════════════════════════════════════════════════════════════════
// renderMoBldKinder() — Дошкольные группы и их наполняемость
// FIX (Issue #12): новые функции — ch-bldKinder и ch-bldKinderCap не рендерились
// Источник: districts[k].kindergartenGroups и districts[k].kindergartenCapacity
// ════════════════════════════════════════════════════════════════════════════
function renderMoBldKinder() {
  var DISTRICTS = AppState.get('districts');
  if (!DISTRICTS) return;

  var dKeys = Object.keys(DISTRICTS);

  // Собрать данные: группы и средняя наполняемость по округам
  var rows = dKeys.map(function (k) {
    var d = DISTRICTS[k];
    if (!d) return null;
    var groups   = typeof d.kindergartenGroups   === 'number' ? d.kindergartenGroups   : null;
    var capacity = typeof d.kindergartenCapacity === 'number' ? d.kindergartenCapacity : null;
    if (groups === null && capacity === null) return null;
    return {
      name:     (d.shortName) || k,
      groups:   groups   || 0,
      capacity: capacity || 0
    };
  }).filter(Boolean);

  if (!rows.length) return;

  // ── ch-bldKinder: кол-во групп по округам (Top-12, по убыванию) ──────────
  var byGroups = rows.slice().sort(function (a, b) { return b.groups - a.groups; }).slice(0, 12);
  var eKinder = document.getElementById('ch-bldKinder');
  if (eKinder) {
    if (eKinder._ec) { eKinder._ec.dispose(); eKinder._ec = null; }
    eKinder._ec = echarts.init(eKinder);
    eKinder._ec.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (params) {
          return params[0].name + ': ' + params[0].value + ' групп';
        }
      },
      grid: { top: 10, right: 60, bottom: 10, left: 150, containLabel: false },
      xAxis: {
        type: 'value',
        name: 'групп'
      },
      yAxis: {
        type: 'category',
        data: byGroups.map(function (r) { return r.name; }),
        axisLabel: { fontSize: 10 },
        inverse: true
      },
      series: [{
        type: 'bar',
        data: byGroups.map(function (r) {
          return { value: r.groups, itemStyle: { color: '#8b5cf6' } };
        }),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 10
        }
      }]
    }, true);
  }

  // ── ch-bldKinderCap: средняя наполняемость дошк. групп (только где есть данные) ──
  var byCap = rows.filter(function (r) { return r.capacity > 0; })
    .slice().sort(function (a, b) { return a.capacity - b.capacity; });

  var eKinderCap = document.getElementById('ch-bldKinderCap');
  if (eKinderCap && byCap.length) {
    if (eKinderCap._ec) { eKinderCap._ec.dispose(); eKinderCap._ec = null; }
    eKinderCap._ec = echarts.init(eKinderCap);
    eKinderCap._ec.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (params) {
          return params[0].name + ': ' + params[0].value + ' чел.';
        }
      },
      grid: { top: 10, right: 60, bottom: 10, left: 150, containLabel: false },
      xAxis: {
        type: 'value',
        name: 'чел.',
        min: 0,
        max: 35
      },
      yAxis: {
        type: 'category',
        data: byCap.map(function (r) { return r.name; }),
        axisLabel: { fontSize: 10 }
      },
      series: [{
        type: 'bar',
        data: byCap.map(function (r) {
          // ≤19 красный, 20–24 жёлтый, 25+ зелёный
          var c = r.capacity <= 19 ? '#ef4444' : r.capacity <= 24 ? '#f59e0b' : '#10b981';
          return { value: r.capacity, itemStyle: { color: c } };
        }),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 10
        },
        markLine: {
          silent: true,
          data: [
            { xAxis: 20, lineStyle: { type: 'dashed', color: '#f59e0b' }, label: { formatter: '20' } },
            { xAxis: 25, lineStyle: { type: 'dashed', color: '#10b981' }, label: { formatter: '25' } }
          ]
        }
      }]
    }, true);
  }
}
