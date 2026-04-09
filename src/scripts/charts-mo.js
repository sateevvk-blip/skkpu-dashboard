/**
 * MO-level tab charts — salary, subvention, problems.
 */

function renderMoSal() {
  var GEO = window._GEO;
  var DISTRICTS = window._DISTRICTS;
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

  // Salary by category chart
  var distNames = Object.keys(DISTRICTS);
  var categories = ['Дошкольное', 'Общее', 'Доп. обр.', 'Руководители', 'Замы', 'Прочие'];
  var targets = [TARGET_PRESCHOOL, TARGET_GENERAL, TARGET_ADDITIONAL, null, null, null];
  var avgByCat = [0, 0, 0, 0, 0, 0];
  var catKeys = ['preschool', 'general', 'additional', 'director', 'deputy', 'other'];
  distNames.forEach(function (n) {
    var s = DISTRICTS[n].salaryByCategory;
    if (s) {
      catKeys.forEach(function (k, i) { avgByCat[i] += s[k]; });
    }
  });
  if (distNames.length > 0) avgByCat = avgByCat.map(function (v) { return Math.round(v / distNames.length); });

  var e2b = document.getElementById('ch-salCat');
  if (!e2b._ec) e2b._ec = echarts.init(e2b);
  e2b._ec.setOption({
    tooltip: { trigger: 'axis', formatter: function (params) {
      var s = params[0];
      var t = targets[s.dataIndex];
      var line = s.name + ': ' + fmt(s.value);
      if (t) line += '<br>Целевой: ' + fmt(t);
      return line;
    }},
    grid: { top: 24, right: 16, bottom: 48, left: 64 },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: 15, fontSize: 10 } },
    yAxis: { type: 'value', name: '₽', axisLabel: { formatter: function (v) { return (v / 1000).toFixed(0) + 'т'; } } },
    series: [{
      type: 'bar',
      data: avgByCat.map(function (v, i) {
        var t = targets[i];
        var c = !t ? '#2563eb' : v >= t ? '#10b981' : '#ef4444';
        return { value: v, itemStyle: { color: c } };
      }),
      label: { show: true, position: 'top', fontSize: 10, formatter: function (p) { return fmtK(p.value); } }
    }]
  });

  // Districts table
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
  var DISTRICTS = window._DISTRICTS;

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

  // Tarification chart (new)
  var distNames = Object.keys(DISTRICTS);
  var tarifPreschool = [];
  var tarifGeneral = [];
  distNames.forEach(function (n) {
    var t = DISTRICTS[n].tarification;
    if (t) {
      tarifPreschool.push(Math.round(t.preschool / 1000000));
      tarifGeneral.push(Math.round(t.general / 1000000));
    }
  });

  var e2c = document.getElementById('ch-tarif');
  if (!e2c._ec) e2c._ec = echarts.init(e2c);
  e2c._ec.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Дошкольное', 'Общее'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, right: 16, bottom: 36, left: 48 },
    xAxis: { type: 'category', data: distNames, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'млн ₽' },
    series: [
      { name: 'Дошкольное', type: 'bar', data: tarifPreschool, itemStyle: { color: '#8b5cf6' } },
      { name: 'Общее', type: 'bar', data: tarifGeneral, itemStyle: { color: '#2563eb' } }
    ]
  });

  // Subsidy plan vs fact chart (new)
  var planData = [];
  var factData = [];
  distNames.forEach(function (n) {
    var s = DISTRICTS[n].subsidyPlanFact;
    if (s) {
      var totalPlan = s.plan.preschoolPed + s.plan.preschoolOther + s.plan.generalPed + s.plan.generalOther;
      var totalFact = s.fact.preschoolPed + s.fact.preschoolOther + s.fact.generalPed + s.fact.generalOther;
      planData.push(Math.round(totalPlan / 1000000));
      factData.push(Math.round(totalFact / 1000000));
    }
  });

  var e2d = document.getElementById('ch-subPlanFact');
  if (!e2d._ec) e2d._ec = echarts.init(e2d);
  e2d._ec.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['План', 'Факт'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, right: 16, bottom: 36, left: 60 },
    xAxis: { type: 'category', data: distNames, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'млн ₽' },
    series: [
      { name: 'План', type: 'bar', data: planData, itemStyle: { color: '#94a3b8' } },
      { name: 'Факт', type: 'bar', data: factData, itemStyle: { color: function (p) {
        var pct = planData[p.dataIndex] > 0 ? (p.data / planData[p.dataIndex]) * 100 : 0;
        return pct < 85 ? '#ef4444' : pct < 95 ? '#f59e0b' : '#10b981';
      } } }
    ]
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

  // Low staffing chart (new)
  var topLowStaff = feats.slice().sort(function (a, b) {
    var sa = a.properties.staffingRate || (85 + Math.random() * 15);
    var sb = b.properties.staffingRate || (85 + Math.random() * 15);
    return sa - sb;
  }).slice(0, 12);

  var el = document.getElementById('ch-prbStaff');
  if (!el._ec) el._ec = echarts.init(el);
  el._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
    xAxis: { type: 'value', min: 70, max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category',
      data: topLowStaff.map(function (f) { return f.properties.name_clean || f.properties.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: topLowStaff.map(function (f) {
        return Math.round((f.properties.staffingRate || (85 + Math.random() * 15)) * 10) / 10;
      }),
      itemStyle: {
        color: function (p) {
          return p.data < 85 ? '#ef4444' : p.data < 95 ? '#f59e0b' : '#10b981';
        }
      },
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 }
    }]
  });
}
