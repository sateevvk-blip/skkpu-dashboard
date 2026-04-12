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
 * - dispose() + echarts.init() перед каждым рендером ch-hrTurnover.
 *
 * FIX (Issue #9/10):
 * - Реализованы renderMoHrStaffing(), renderMoHrAge(), renderMoHrTenure().
 * - Все три используют поля age, experience, staffingRate из employees[].
 * - dispose() + echarts.init() перед каждым рендером для всех графиков.
 *
 * FIX (Issue #12):
 * - ch-hrFired переименован в ch-hrTurnover (соответствует index.html).
 * - ch-hrTenure переименован в ch-hrExp (соответствует index.html).
 * - Добавлена renderMoHrVacancy() — средний срок закрытия вакансии по округам (ch-hrVacancy).
 *
 * FIX (Issue #25):
 * - renderMoHr() переписана: суррогатные прокси заменены расчётом по dismissedAt.
 * - График показывает % увольнений по периодам YYYY-MM.
 */

// ── Вспомогательная функция: dispose + init ──────────────────────────────────────────
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

// ── Группировка employees по districtId ───────────────────────────────────────────
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
// renderMoHr() — % уволившихся по периодам (ch-hrTurnover)
// FIX #25: заменяем суррогатные прокси реальным расчётом по dismissedAt
// ════════════════════════════════════════════════════════════════════════════
function renderMoHr() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;

  // Фильтруем только уволенных (есть dismissedAt)
  var fired = employees.filter(function (e) {
    return e.dismissedAt;
  });

  if (!fired.length) return;

  // Группируем по периоду YYYY-MM
  var byPeriod = {};
  fired.forEach(function (e) {
    var period = e.dismissedAt.slice(0, 7);
    if (!byPeriod[period]) byPeriod[period] = 0;
    byPeriod[period]++;
  });

  var total = employees.length || 1;
  var periods = Object.keys(byPeriod).sort();

  var chart = _initChart('ch-hrTurnover');
  if (!chart) return;

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        return params[0].name + ': ' + params[0].value + '%';
      }
    },
    grid: { top: 20, right: 60, bottom: 48, left: 60 },
    xAxis: {
      type: 'category',
      data: periods,
      axisLabel: { rotate: 45, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' }
    },
    series: [{
      name: '% уволившихся',
      type: 'bar',
      data: periods.map(function (p) {
        return Math.round((byPeriod[p] / total) * 1000) / 10;
      }),
      itemStyle: { color: '#ef4444' },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 10
      }
    }]
  });
}

// ════════════════════════════════════════════════════════════════════════════
// renderMoHrStaffing() — Укомплектованность педагогами (ch-hrStaffing)
// ════════════════════════════════════════════════════════════════════════════
function renderMoHrStaffing() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;

  var byDistrict = _groupByDistrict(employees);

  var rows = Object.keys(byDistrict).map(function (name) {
    var list = byDistrict[name].filter(function (e) {
      return typeof e.staffingRate === 'number';
    });
    if (!list.length) return null;
    var avg = list.reduce(function (s, e) { return s + e.staffingRate; }, 0) / list.length;
    return { name: name, value: Math.round(avg * 1000) / 10 };
  }).filter(Boolean);

  rows.sort(function (a, b) { return a.value - b.value; });

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
// renderMoHrTenure() — Средний стаж работы (ch-hrExp)
// FIX #12: исправлен ID с ch-hrTenure на ch-hrExp
// ════════════════════════════════════════════════════════════════════════════
function renderMoHrTenure() {
  var DISTRICTS = AppState.get('districts');
  if (!DISTRICTS) return;

  var dKeys = Object.keys(DISTRICTS);

  var rows = dKeys.map(function (k) {
    var hr = DISTRICTS[k].hrMetrics;
    if (!hr || typeof hr.avgExperience !== 'number') return null;
    var name = (DISTRICTS[k].shortName) || k;
    return { name: name, value: hr.avgExperience };
  }).filter(Boolean);

  if (!rows.length) {
    // fallback: попробовать employees
    var employees = AppState.get('employees');
    if (!employees || !employees.length) return;
    var byDistrict = _groupByDistrict(employees);
    rows = Object.keys(byDistrict).map(function (name) {
      var list = byDistrict[name].filter(function (e) { return typeof e.experience === 'number'; });
      if (!list.length) return null;
      var avg = list.reduce(function (s, e) { return s + e.experience; }, 0) / list.length;
      return { name: name, value: Math.round(avg * 10) / 10 };
    }).filter(Boolean);
  }

  rows.sort(function (a, b) { return a.value - b.value; });

  var colors = rows.map(function (r) {
    if (r.value < 3) return '#ef4444';
    if (r.value < 7) return '#fbbf24';
    return '#22c55e';
  });

  // FIX #12: ch-hrTenure → ch-hrExp
  var chart = _initChart('ch-hrExp');
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

// ════════════════════════════════════════════════════════════════════════════
// renderMoHrVacancy() — Средний срок закрытия вакансии по округам (ch-hrVacancy)
// FIX #12: новая функция — контейнер ch-hrVacancy не рендерился
// Источник: districts[k].hrMetrics.vacancyCloseDays
// ════════════════════════════════════════════════════════════════════════════
function renderMoHrVacancy() {
  var DISTRICTS = AppState.get('districts');
  if (!DISTRICTS) return;

  var dKeys = Object.keys(DISTRICTS);

  var rows = dKeys.map(function (k) {
    var hr = DISTRICTS[k].hrMetrics;
    if (!hr || typeof hr.vacancyCloseDays !== 'number') return null;
    var name = (DISTRICTS[k].shortName) || k;
    return { name: name, value: hr.vacancyCloseDays };
  }).filter(Boolean);

  if (!rows.length) return;

  rows.sort(function (a, b) { return b.value - a.value; });
  var top12 = rows.slice(0, 12);

  var chart = _initChart('ch-hrVacancy');
  if (!chart) return;

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        return params[0].name + ': ' + params[0].value + ' дн.';
      }
    },
    grid: { top: 10, right: 70, bottom: 10, left: 150, containLabel: false },
    xAxis: {
      type: 'value',
      name: 'дней',
      axisLabel: { formatter: '{value} дн.' }
    },
    yAxis: {
      type: 'category',
      data: top12.map(function (r) { return r.name; }),
      axisLabel: { fontSize: 10 },
      inverse: true
    },
    series: [{
      type: 'bar',
      data: top12.map(function (r) {
        // <45 дн → зелёный, 45–60 → жёлтый, >60 → красный
        var c = r.value <= 45 ? '#22c55e' : r.value <= 60 ? '#fbbf24' : '#ef4444';
        return { value: r.value, itemStyle: { color: c } };
      }),
      label: {
        show: true,
        position: 'right',
        formatter: '{c} дн.',
        fontSize: 10
      }
    }]
  });
}
