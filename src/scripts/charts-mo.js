/**
 * MO-level tab charts — salary, subvention, problems.
 */

function renderMoSal() {
  var GEO = window._GEO;
  var feats = GEO.features;

  var e1 = document.getElementById('ch-salDist');
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

  var e2 = document.getElementById('ch-gauge');
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

  var sorted = feats.slice().sort(function (a, b) {
    var o = { r: 0, y: 1, g: 2 };
    return o[a.properties.r] - o[b.properties.r] || a.properties.zp - b.properties.zp;
  });
  document.getElementById('tb-districts').innerHTML = sorted.map(function (f) {
    var p = f.properties;
    var n = p.name_clean || p.name;
    return '<tr onclick="openDistrict(\'' + n.replace(/'/g, "\\'") + '\')">' +
      '<td><b>' + n + '</b></td>' +
      '<td style="font-weight:700;color:' + (p.zp >= TARGET ? '#059669' : '#dc2626') + '">' + fmtK(p.zp) + '</td>' +
      '<td style="color:' + (p.zp >= TARGET ? '#059669' : '#dc2626') + '">' + fmtDiff(p.zp) + '</td>' +
      '<td>' + p.ahr + '%</td><td>' + p.cap + '%</td><td>' + pill(p.r) + '</td></tr>';
  }).join('');
}

function renderMoSub() {
  var e1 = document.getElementById('ch-wf');
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

  var e2 = document.getElementById('ch-subBar');
  if (!e2._ec) e2._ec = echarts.init(e2);
  e2._ec.setOption({
    tooltip: {}, grid: { top: 10, right: 52, bottom: 10, left: 100 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: ['Шатура', 'Клин', 'Луховицы', 'Кашира', 'Коломна', 'Одинцово', 'Химки'], axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', data: [79, 82, 86, 88, 91, 95, 97],
      itemStyle: { color: function (p) { return p.data < 85 ? '#ef4444' : p.data < 92 ? '#f59e0b' : '#10b981'; } },
      label: { show: true, position: 'right', formatter: '{c}%' }
    }]
  });

  var e3 = document.getElementById('ch-subLine');
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
  var GEO = window._GEO;
  var feats = GEO.features;
  var topAhr = feats.slice().sort(function (a, b) { return b.properties.ahr - a.properties.ahr; }).slice(0, 12);
  var topCap = feats.slice().sort(function (a, b) { return a.properties.cap - b.properties.cap; }).slice(0, 12);
  var topExt = feats.slice().sort(function (a, b) { return b.properties.ext - a.properties.ext; }).slice(0, 12);

  [
    { id: 'ch-ahr', data: topAhr, key: 'ahr' },
    { id: 'ch-cap', data: topCap, key: 'cap' },
    { id: 'ch-ext', data: topExt, key: 'ext' }
  ].forEach(function (cfg) {
    var el = document.getElementById(cfg.id);
    if (!el._ec) el._ec = echarts.init(el);
    var vals = cfg.data.map(function (f) { return f.properties[cfg.key]; });
    var min = cfg.key === 'cap' ? 52 : 0;
    var max = cfg.key === 'cap' ? 100 : cfg.key === 'ahr' ? 56 : 44;
    el._ec.setOption({
      tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
      xAxis: { type: 'value', min: min, max: max, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: cfg.data.map(function (f) { return f.properties.name_clean || f.properties.name; }), axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar', data: vals,
        itemStyle: {
          color: function (p) {
            var v = p.data;
            if (cfg.key === 'ahr') return v > 40 ? '#ef4444' : v > 35 ? '#f59e0b' : '#10b981';
            if (cfg.key === 'cap') return v < 70 ? '#ef4444' : v < 80 ? '#f59e0b' : '#10b981';
            return v > 30 ? '#ef4444' : v > 25 ? '#f59e0b' : '#10b981';
          }
        },
        label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 }
      }]
    });
  });
}
