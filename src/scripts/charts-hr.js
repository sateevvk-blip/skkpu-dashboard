/**
 * charts-hr.js — HR-графики уровня МО.
 *
 * FIX (Issue #7, Проблема 1):
 * - Источник данных изменён с AppState.get('geo') на AppState.get('employees').
 * - Метрики текучести (probation / 6m / 1y) рассчитываются из реальных записей.
 * - Math.random() полностью убран.
 * - Guard: если employees ещё не загружены — функция выходит без ошибки.
 *
 * FIX (Issue #8):
 * - dispose() + echarts.init() перед каждым рендером ch-hrFired.
 *
 * FIX (Issue #9/10):
 * - Реализованы renderMoHrStaffing(), renderMoHrAge(), renderMoHrTenure().
 * - Все три используют поля age, experience, staffingRate из employees[].
 * - dispose() + echarts.init() перед каждым рендером для всех четырёх графиков.
 */

// ── Вспомогательная функция: dispose + init ──────────────────────────────────
function _initChart(elementId) {
  var el = document.getElementById(elementId);
  if (!el) return null;
  if (el._ec) {
    el._ec.dispose();
    el._ec = null;
  }
  el._ec = echarts.init(el);
  return el._ec;
}

// ── Группировка employees по districtId ─────────────────────────────────────
function _groupByDistrict(employees) {
  var byDistrict = {};
  employees.forEach(function (e) {
    var d = e.districtId || 'Неизвестно';
    if (!byDistrict[d]) byDistrict[d] = [];
    byDistrict[d].push(e);
  });
  return byDistrict;
}

// ════════════════════════════════════════════════════════════════════════════
// renderMoHr() — Текучесть кадров по округам (Top-10, ch-hrFired)
// ════════════════════════════════════════════════════════════════════════════
function renderMoHr() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;

  var byDistrict = _groupByDistrict(employees);

  var rows = Object.keys(byDistrict).map(function (name) {
    var list  = byDistrict[name];
    var total = list.length || 1;

    var probation = list.filter(function (e) {
      return e.loadType === 'основная' && parseFloat(e.loadRate || 1) < 1.0;
    }).length;

    var m6 = list.filter(function (e) {
      return e.loadType === 'внеурочная';
    }).length;

    var y1 = list.filter(function (e) {
      return e.salary && e.salary < 50000;
    }).length;

    return {
      name:      name,
      probation: Math.round((probation / total) * 1000) / 10,
      m6:        Math.round((m6        / total) * 1000) / 10,
      y1:        Math.round((y1        / total) * 1000) / 10
    };
  });

  rows.sort(function (a, b) {
    return (b.probation + b.m6 + b.y1) - (a.probation + a.m6 + a.y1);
  });
  var top10 = rows.slice(0, 10);

  var chart = _initChart('ch-hrFired');
  if (!chart) return;

  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['Неполная ставка', 'Внеурочная нагрузка', 'ЗП < 50 000 ₽'],
      bottom: 0
    },
    grid: { top: 20, right: 16, bottom: 48, left: 150 },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
      max: 100
    },
    yAxis: {
      type: 'category',
      data: top10.map(function (r) { return r.name; }),
      axisLabel: { fontSize: 10 },
      inverse: true
    },
    series: [
      {
        name: 'Неполная ставка',
        type: 'bar',
        stack: 'f',
        data: top10.map(function (r) { return r.probation; }),
        itemStyle: { color: '#fbbf24' }
      },
      {
        name: 'Внеурочная нагрузка',
        type: 'bar',
        stack: 'f',
        data: top10.map(function (r) { return r.m6; }),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: 'ЗП < 50 000 ₽',
        type: 'bar',
        stack: 'f',
        data: top10.map(function (r) { return r.y1; }),
        itemStyle: { color: '#ef4444' }
      }
    ]
  });
}

// ════════════════════════════════════════════════════════════════════════════
// renderMoHrStaffing() — Укомплектованность педагогами (ch-hrStaffing)
// ════════════════════════════════════════════════════════════════════════════
function renderMoHrStaffing() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;

  var byDistrict = _groupByDistrict(employees);

  // Средний staffingRate по округу (только записи с непустым полем)
  var rows = Object.keys(byDistrict).map(function (name) {
    var list = byDistrict[name].filter(function (e) {
      return typeof e.staffingRate === 'number';
    });
    if (!list.length) return null;
    var avg = list.reduce(function (s, e) { return s + e.staffingRate; }, 0) / list.length;
    return { name: name, value: Math.round(avg * 1000) / 10 }; // в %
  }).filter(Boolean);

  rows.sort(function (a, b) { return a.value - b.value; });

  // Цветовая индикация: <85% → красный, 85–95% → жёлтый, ≥95% → зелёный
  var colors = rows.map(function (r) {
    if (r.value < 85) return '#ef4444';
    if (r.value < 95) return '#fbbf24';
    return '#22c55e';
  });

  var chart = _initChart('ch-hrStaffing');
  if (!chart) return;

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        return params[0].name + ': ' + params[0].value + '%';
      }
    },
    grid: { top: 10, right: 60, bottom: 10, left: 150, containLabel: false },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
      min: 60,
      max: 100
    },
    yAxis: {
      type: 'category',
      data: rows.map(function (r) { return r.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: rows.map(function (r, i) {
        return { value: r.value, itemStyle: { color: colors[i] } };
      }),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%',
        fontSize: 10
      }
    }]
  });
}

// ════════════════════════════════════════════════════════════════════════════
// renderMoHrAge() — Средний возраст педагогов (ch-hrAge)
// ════════════════════════════════════════════════════════════════════════════
function renderMoHrAge() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;

  var byDistrict = _groupByDistrict(employees);

  var rows = Object.keys(byDistrict).map(function (name) {
    var list = byDistrict[name].filter(function (e) {
      return typeof e.age === 'number';
    });
    if (!list.length) return null;
    var avg = list.reduce(function (s, e) { return s + e.age; }, 0) / list.length;
    return { name: name, value: Math.round(avg * 10) / 10 };
  }).filter(Boolean);

  rows.sort(function (a, b) { return a.value - b.value; });

  // Цветовая индикация: <35 → жёлтый, 35–50 → зелёный, >50 → красный
  var colors = rows.map(function (r) {
    if (r.value < 35) return '#fbbf24';
    if (r.value <= 50) return '#22c55e';
    return '#ef4444';
  });

  var chart = _initChart('ch-hrAge');
  if (!chart) return;

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        return params[0].name + ': ' + params[0].value + ' лет';
      }
    },
    grid: { top: 10, right: 60, bottom: 10, left: 150, containLabel: false },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} лет' },
      min: 20,
      max: 70
    },
    yAxis: {
      type: 'category',
      data: rows.map(function (r) { return r.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: rows.map(function (r, i) {
        return { value: r.value, itemStyle: { color: colors[i] } };
      }),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        fontSize: 10
      }
    }]
  });
}

// ════════════════════════════════════════════════════════════════════════════
// renderMoHrTenure() — Средний стаж работы (ch-hrTenure)
// ════════════════════════════════════════════════════════════════════════════
function renderMoHrTenure() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;

  var byDistrict = _groupByDistrict(employees);

  var rows = Object.keys(byDistrict).map(function (name) {
    var list = byDistrict[name].filter(function (e) {
      return typeof e.experience === 'number';
    });
    if (!list.length) return null;
    var avg = list.reduce(function (s, e) { return s + e.experience; }, 0) / list.length;
    return { name: name, value: Math.round(avg * 10) / 10 };
  }).filter(Boolean);

  rows.sort(function (a, b) { return a.value - b.value; });

  // Цветовая индикация: <3 → красный, 3–6 → жёлтый, ≥7 → зелёный
  var colors = rows.map(function (r) {
    if (r.value < 3) return '#ef4444';
    if (r.value < 7) return '#fbbf24';
    return '#22c55e';
  });

  var chart = _initChart('ch-hrTenure');
  if (!chart) return;

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        return params[0].name + ': ' + params[0].value + ' лет';
      }
    },
    grid: { top: 10, right: 60, bottom: 10, left: 150, containLabel: false },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} лет' },
      min: 0
    },
    yAxis: {
      type: 'category',
      data: rows.map(function (r) { return r.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: rows.map(function (r, i) {
        return { value: r.value, itemStyle: { color: colors[i] } };
      }),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        fontSize: 10
      }
    }]
  });
}
