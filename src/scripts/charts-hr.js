/**
 * charts-hr.js — HR-графики уровня МО.
 *
 * FIX (Issue #7, Проблема 1):
 * - Источник данных изменён с AppState.get('geo') на AppState.get('employees').
 * - Метрики текучести (probation / 6m / 1y) рассчитываются из реальных записей:
 *     probation — доля сотрудников с loadRate < 1.0 и loadType === 'основная'
 *     6m        — доля сотрудников с loadType === 'внеурочная'
 *     1y        — доля сотрудников с salary < 50000 (маркер риска)
 *   Все три значения — проценты от общего числа записей округа.
 * - Math.random() полностью убран.
 * - Guard: если employees ещё не загружены — функция выходит без ошибки.
 */

function renderMoHr() {
  var employees = AppState.get('employees');
  if (!employees || !employees.length) return;  // guard: данные ещё не загружены

  // ── Группируем записи по округу ─────────────────────────────────────────
  var byDistrict = {};
  employees.forEach(function (e) {
    var d = e.districtId || 'Неизвестно';
    if (!byDistrict[d]) byDistrict[d] = [];
    byDistrict[d].push(e);
  });

  // ── Считаем метрики для каждого округа ─────────────────────────────────
  // probation: % сотрудников с основной нагрузкой и ставкой < 1.0
  //            (потенциально «испытательный» / неполная ставка)
  // m6:        % записей с внеурочной нагрузкой
  //            (нагрузка сверх основного места — риск выгорания)
  // y1:        % сотрудников с зарплатой < 50 000 руб.
  //            (риск ухода по финансовым причинам)
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
      probation: Math.round((probation / total) * 1000) / 10,  // %
      m6:        Math.round((m6        / total) * 1000) / 10,
      y1:        Math.round((y1        / total) * 1000) / 10
    };
  });

  // ── Top-10 по суммарному риску ───────────────────────────────────────────
  rows.sort(function (a, b) {
    return (b.probation + b.m6 + b.y1) - (a.probation + a.m6 + a.y1);
  });
  var top10 = rows.slice(0, 10);

  // ── Рендер графика ch-hrFired ────────────────────────────────────────────
  var eFired = document.getElementById('ch-hrFired');
  if (!eFired) return;
  if (!eFired._ec) eFired._ec = echarts.init(eFired);

  eFired._ec.setOption({
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
  }, true);
}
