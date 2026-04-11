/**
 * charts-hr.js — HR-графики уровня МО.
 *
 * Логика из patch-stage2-charts-hr.js поглощена здесь.
 * Данные читаются из AppState.
 *
 * FIX (Проблема 1): добавлен null-guard — если GEO ещё не загружен,
 * функция завершается без ошибки. Вызов renderMoHr() уже прописан
 * в navigation.js → moTab('hr'), поэтому дополнительных изменений
 * в навигации не требуется.
 */

function renderMoHr() {
  const GEO = AppState.get('geo');
  if (!GEO || !GEO.features) return;          // guard: данные ещё не загружены
  const feats = GEO.features;

  function dLabel(f) { return f.properties.name_clean || f.properties.name; }
  function hrD(p) {
    return {
      firedProbation: p.firedProbation || (1  + Math.random() * 10),
      fired6m:        p.fired6m        || (2  + Math.random() * 14),
      fired1y:        p.fired1y        || (3  + Math.random() * 18)
    };
  }

  // ch-hrFired: Top-10 текучести по периодам — из patch-stage2-charts-hr.js
  const rows = feats.map(function (f) {
    const h = hrD(f.properties);
    return {
      name:      dLabel(f),
      probation: Math.round(h.firedProbation * 10) / 10,
      m6:        Math.round(h.fired6m        * 10) / 10,
      y1:        Math.round(h.fired1y        * 10) / 10
    };
  });
  rows.sort(function (a, b) { return (b.probation + b.m6 + b.y1) - (a.probation + a.m6 + a.y1); });
  const top10 = rows.slice(0, 10);

  const eFired = document.getElementById('ch-hrFired');
  if (!eFired) return;
  if (!eFired._ec) eFired._ec = echarts.init(eFired);
  eFired._ec.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Испыт. срок', '6 месяцев', 'Год'], bottom: 0 },
    grid: { top: 20, right: 16, bottom: 40, left: 150 },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: top10.map(function (r) { return r.name; }), axisLabel: { fontSize: 10 }, inverse: true },
    series: [
      { name: 'Испыт. срок', type: 'bar', stack: 'f', data: top10.map(function (r) { return r.probation; }), itemStyle: { color: '#fbbf24' } },
      { name: '6 месяцев',   type: 'bar', stack: 'f', data: top10.map(function (r) { return r.m6; }),        itemStyle: { color: '#f59e0b' } },
      { name: 'Год',         type: 'bar', stack: 'f', data: top10.map(function (r) { return r.y1; }),        itemStyle: { color: '#ef4444' } }
    ]
  }, true);
}
