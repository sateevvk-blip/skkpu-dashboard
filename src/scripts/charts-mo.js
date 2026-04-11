/**
 * charts-mo.js — графики уровня МО (зарплаты, субвенции, проблемы).
 *
 * Данные читаются из AppState. Вся логика из patch-stage2-charts-mo.js
 * и patch-stage3-subbar.js поглощена здесь.
 * patch-stage4-prob.js поглощён: renderMoProb вызывается при смене таба.
 */

function renderMoSal() {
  const GEO       = AppState.get('geo');
  const DISTRICTS = AppState.get('districts');
  const feats     = GEO.features;

  const e1 = document.getElementById('ch-salDist');
  if (!e1._ec) e1._ec = echarts.init(e1);
  e1._ec.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 24, right: 16, bottom: 48, left: 52 },
    xAxis: { type: 'category', data: ['<55 т.₽', '55–60 т.₽', '60–65 т.₽', '65–70 т.₽', '70–75 т.₽', '75–80 т.₽', '>80 т.₽'], axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: { type: 'value', name: 'Педагогов' },
    series: [{
      type: 'bar', data: [48, 114, 186, 342, 512, 780, 314],
      itemStyle: { color: function (p) { return p.dataIndex < 2 ? '#ef4444' : p.dataIndex < 4 ? '#f59e0b' : '#10b981'; } },
      label: { show: true, position: 'top', fontSize: 10 }
    }]
  });

  const e2 = document.getElementById('ch-gauge');
  if (!e2._ec) e2._ec = echarts.init(e2);
  e2._ec.setOption({
    series: [{
      type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100,
      progress: { show: true, width: 14 },
      axisLine: { lineStyle: { width: 14, color: [[.5, '#ef4444'], [.75, '#f59e0b'], [1, '#10b981']] } },
      axisTick: { show: false }, splitLine: { distance: -16, length: 8 },
      axisLabel: { distance: -28, fontSize: 10 },
      pointer: { length: '55%', width: 6 },
      detail: { formatter: '{value}%', fontSize: 30, offsetCenter: [0, '30%'], fontWeight: 'bold' },
      title: { offsetCenter: [0, '55%'], fontSize: 11, color: '#6b7280' },
      data: [{ value: 91.7, name: 'Педагогов достигли цели' }]
    }]
  });

  const distNames = Object.keys(DISTRICTS);
  const categories = ['Дошкольное', 'Общее', 'Доп. обр.', 'Руководители', 'Замы', 'Прочие'];
  const targets = [TARGET_PRESCHOOL, TARGET_GENERAL, TARGET_ADDITIONAL, null, null, null];
  const catKeys = ['preschool', 'general', 'additional', 'director', 'deputy', 'other'];
  let avgByCat = [0, 0, 0, 0, 0, 0];
  distNames.forEach(function (n) {
    const s = DISTRICTS[n].salaryByCategory;
    if (s) catKeys.forEach(function (k, i) { avgByCat[i] += s[k]; });
  });
  if (distNames.length > 0) avgByCat = avgByCat.map(function (v) { return Math.round(v / distNames.length); });

  const e2b = document.getElementById('ch-salCat');
  if (!e2b._ec) e2b._ec = echarts.init(e2b);
  e2b._ec.setOption({
    tooltip: { trigger: 'axis', formatter: function (params) {
      const s = params[0];
      const t = targets[s.dataIndex];
      let line = s.name + ': ' + fmt(s.value);
      if (t) line += '<br>Целевой: ' + fmt(t);
      return line;
    }},
    grid: { top: 24, right: 16, bottom: 48, left: 64 },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: 15, fontSize: 10 } },
    yAxis: { type: 'value', name: '₽', axisLabel: { formatter: function (v) { return (v / 1000).toFixed(0) + 'т'; } } },
    series: [{
      type: 'bar',
      data: avgByCat.map(function (v, i) {
        const t = targets[i];
        const c = !t ? '#2563eb' : v >= t ? '#10b981' : '#ef4444';
        return { value: v, itemStyle: { color: c } };
      }),
      label: { show: true, position: 'top', fontSize: 10, formatter: function (p) { return fmtK(p.value); } }
    }]
  });

  // Таблица округов
  const sorted = feats.slice().sort(function (a, b) {
    const o = { r: 0, y: 1, g: 2 };
    return o[a.properties.r] - o[b.properties.r] || a.properties.zp - b.properties.zp;
  });
  document.getElementById('tb-districts').innerHTML = sorted.map(function (f) {
    const p = f.properties;
    const n = p.name_clean || p.name;
    return '<tr onclick="openDistrict(\'' + n.replace(/'/g, "\\'") + '\')">' +
      '<td><b>' + n + '</b></td>' +
      '<td style="font-weight:700;color:' + (p.zp >= TARGET ? '#059669' : '#dc2626') + '">' + fmtK(p.zp) + '</td>' +
      '<td style="color:' + (p.zp >= TARGET ? '#059669' : '#dc2626') + '">' + fmtDiff(p.zp) + '</td>' +
      '<td>' + p.ahr + '%</td><td>' + p.cap + '%</td><td>' + pill(p.r) + '</td></tr>';
  }).join('');
}

function renderMoSub() {
  const DISTRICTS = AppState.get('districts');
  const dKeys     = Object.keys(DISTRICTS);

  function dName(k) { return (DISTRICTS[k] && DISTRICTS[k].shortName) || k; }

  // Водопад расходов субвенции
  const e1 = document.getElementById('ch-wf');
  if (!e1._ec) e1._ec = echarts.init(e1);
  e1._ec.setOption({
    tooltip: {}, grid: { top: 20, right: 16, bottom: 40, left: 64 },
    xAxis: { type: 'category', data: ['Субвенция', 'ФОТ пед.', 'ФОТ АХР', 'Стимул.', 'Компенс.', 'Остаток'], axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'млн ₽' },
    series: [{
      type: 'bar',
      data: [
        { value: 2850, itemStyle: { color: '#2563eb' } },
        { value: -1620, itemStyle: { color: '#ef4444' } },
        { value: -510, itemStyle: { color: '#f59e0b' } },
        { value: -280, itemStyle: { color: '#f59e0b' } },
        { value: -145, itemStyle: { color: '#f59e0b' } },
        { value: 127, itemStyle: { color: '#10b981' } }
      ],
      label: { show: true, position: 'top', fontSize: 10, formatter: function (p) { return p.value > 0 ? '+' + p.value : p.value; } }
    }]
  });

  // ch-subBar: Top-7 с наименьшим % исполнения — из patch-stage3-subbar.js
  const subBarRows = dKeys.map(function (k) {
    const d = DISTRICTS[k];
    const s = d.subsidyPlanFact || {};
    const pl = s.plan || {}; const fc = s.fact || {};
    const plan = (pl.preschoolPed || 0) + (pl.preschoolOther || 0) + (pl.generalPed || 0) + (pl.generalOther || 0);
    const fact = (fc.preschoolPed || 0) + (fc.preschoolOther || 0) + (fc.generalPed || 0) + (fc.generalOther || 0);
    const pct = plan > 0 ? Math.round(fact / plan * 100) : Math.round(79 + Math.random() * 18);
    return { name: dName(k), pct: pct };
  });
  subBarRows.sort(function (a, b) { return a.pct - b.pct; });
  const bottom7 = subBarRows.slice(0, 7);
  const eSubBar = document.getElementById('ch-subBar');
  if (!eSubBar._ec) eSubBar._ec = echarts.init(eSubBar);
  eSubBar._ec.setOption({
    tooltip: { trigger: 'axis' }, grid: { top: 10, right: 60, bottom: 10, left: 150 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: bottom7.map(function (r) { return r.name; }), axisLabel: { fontSize: 11 }, inverse: true },
    series: [{ type: 'bar', data: bottom7.map(function (r) {
      return { value: r.pct, itemStyle: { color: r.pct < 85 ? '#ef4444' : r.pct < 92 ? '#f59e0b' : '#10b981' } };
    }), label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11 } }]
  }, true);

  // ch-tarif: Top-10 по сумме тарификации — из patch-stage2-charts-mo.js
  const tarRows = dKeys.map(function (k) {
    const t = DISTRICTS[k].tarification || {};
    const pre = Math.round((t.preschool || 0) / 1e6);
    const gen = Math.round((t.general   || 0) / 1e6);
    return { name: dName(k), pre: pre, gen: gen, total: pre + gen };
  });
  tarRows.sort(function (a, b) { return b.total - a.total; });
  const tarTop = tarRows.slice(0, 10);
  const eTar = document.getElementById('ch-tarif');
  if (eTar) {
    if (!eTar._ec) eTar._ec = echarts.init(eTar);
    eTar._ec.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Дошкольное', 'Общее'], bottom: 0 },
      grid: { top: 16, right: 16, bottom: 36, left: 140 },
      xAxis: { type: 'value', name: 'млн ₽' },
      yAxis: { type: 'category', data: tarTop.map(function (r) { return r.name; }), inverse: true },
      series: [
        { name: 'Дошкольное', type: 'bar', stack: 'tar', data: tarTop.map(function (r) { return r.pre; }), itemStyle: { color: '#8b5cf6' } },
        { name: 'Общее', type: 'bar', stack: 'tar', data: tarTop.map(function (r) { return r.gen; }), itemStyle: { color: '#2563eb' },
          label: { show: true, position: 'right', fontSize: 10, formatter: function (p) { return (p.data + tarTop[p.dataIndex].pre) + ' млн'; } } }
      ]
    }, true);
  }

  // ch-subPlanFact: Top-10 по плану + % исполнения — из patch-stage2-charts-mo.js
  const pfRows = dKeys.map(function (k) {
    const s = DISTRICTS[k].subsidyPlanFact || {};
    const pl = s.plan || {}; const fc = s.fact || {};
    const plan = Math.round(((pl.preschoolPed || 0) + (pl.preschoolOther || 0) + (pl.generalPed || 0) + (pl.generalOther || 0)) / 1e6);
    const fact = Math.round(((fc.preschoolPed || 0) + (fc.preschoolOther || 0) + (fc.generalPed || 0) + (fc.generalOther || 0)) / 1e6);
    return { name: dName(k), plan: plan, fact: fact, pct: plan > 0 ? fact / plan * 100 : 0 };
  });
  pfRows.sort(function (a, b) { return b.plan - a.plan; });
  const pfTop = pfRows.slice(0, 10);
  const ePF = document.getElementById('ch-subPlanFact');
  if (ePF) {
    if (!ePF._ec) ePF._ec = echarts.init(ePF);
    ePF._ec.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['План', 'Факт'], bottom: 0 },
      grid: { top: 16, right: 16, bottom: 36, left: 140 },
      xAxis: { type: 'value', name: 'млн ₽' },
      yAxis: { type: 'category', data: pfTop.map(function (r) { return r.name; }), inverse: true },
      series: [
        { name: 'План', type: 'bar', barGap: '5%', data: pfTop.map(function (r) { return r.plan; }), itemStyle: { color: '#94a3b8' } },
        { name: 'Факт', type: 'bar', data: pfTop.map(function (r) {
          return { value: r.fact, itemStyle: { color: r.pct < 85 ? '#ef4444' : r.pct < 95 ? '#f59e0b' : '#10b981' } };
        }), label: { show: true, position: 'right', fontSize: 10,
          formatter: function (p) { return pfTop[p.dataIndex].pct.toFixed(0) + '%'; } } }
      ]
    }, true);
  }

  const e3 = document.getElementById('ch-subLine');
  if (!e3._ec) e3._ec = echarts.init(e3);
  e3._ec.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['План', 'Факт'], bottom: 0 },
    grid: { top: 20, right: 16, bottom: 36, left: 60 },
    xAxis: { type: 'category', data: ['Сент', 'Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар'] },
    yAxis: { type: 'value', name: 'млн ₽' },
    series: [
      { name: 'План', type: 'line', data: [285, 570, 855, 1140, 1425, 1710, 1995], lineStyle: { type: 'dashed', color: '#94a3b8' }, itemStyle: { color: '#94a3b8' } },
      { name: 'Факт', type: 'line', data: [271, 538, 813, 1090, 1374, 1651, 1938], areaStyle: { color: 'rgba(37,99,235,.08)' }, lineStyle: { color: '#2563eb' }, itemStyle: { color: '#2563eb' }, symbol: 'circle', symbolSize: 6 }
    ]
  });
}

function renderMoProb() {
  const GEO   = AppState.get('geo');
  const feats = GEO.features;
  const topAhr = feats.slice().sort(function (a, b) { return b.properties.ahr - a.properties.ahr; }).slice(0, 12);
  const topCap = feats.slice().sort(function (a, b) { return a.properties.cap - b.properties.cap; }).slice(0, 12);
  const topExt = feats.slice().sort(function (a, b) { return b.properties.ext - a.properties.ext; }).slice(0, 12);

  [{ id: 'ch-ahr', data: topAhr, key: 'ahr' },
   { id: 'ch-cap', data: topCap, key: 'cap' },
   { id: 'ch-ext', data: topExt, key: 'ext' }
  ].forEach(function (cfg) {
    const el = document.getElementById(cfg.id);
    if (!el._ec) el._ec = echarts.init(el);
    const vals = cfg.data.map(function (f) { return f.properties[cfg.key]; });
    const min = cfg.key === 'cap' ? 52 : 0;
    const max = cfg.key === 'cap' ? 100 : cfg.key === 'ahr' ? 56 : 44;
    el._ec.setOption({
      tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
      xAxis: { type: 'value', min: min, max: max, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: cfg.data.map(function (f) { return f.properties.name_clean || f.properties.name; }), axisLabel: { fontSize: 10 } },
      series: [{ type: 'bar', data: vals, itemStyle: { color: function (p) {
        const v = p.data;
        if (cfg.key === 'ahr') return v > 40 ? '#ef4444' : v > 35 ? '#f59e0b' : '#10b981';
        if (cfg.key === 'cap') return v < 70 ? '#ef4444' : v < 80 ? '#f59e0b' : '#10b981';
        return v > 30 ? '#ef4444' : v > 25 ? '#f59e0b' : '#10b981';
      }}, label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 } }]
    });
  });

  const topLowStaff = feats.slice().sort(function (a, b) {
    const sa = a.properties.staffingRate || (85 + Math.random() * 15);
    const sb = b.properties.staffingRate || (85 + Math.random() * 15);
    return sa - sb;
  }).slice(0, 12);
  const elStaff = document.getElementById('ch-prbStaff');
  if (!elStaff._ec) elStaff._ec = echarts.init(elStaff);
  elStaff._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
    xAxis: { type: 'value', min: 70, max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: topLowStaff.map(function (f) { return f.properties.name_clean || f.properties.name; }), axisLabel: { fontSize: 10 } },
    series: [{ type: 'bar', data: topLowStaff.map(function (f) {
      return Math.round((f.properties.staffingRate || (85 + Math.random() * 15)) * 10) / 10;
    }), itemStyle: { color: function (p) { return p.data < 85 ? '#ef4444' : p.data < 95 ? '#f59e0b' : '#10b981'; } },
    label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 } }]
  });
}
