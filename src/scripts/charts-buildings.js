/**
 * MO-level Buildings (Здания и классы) tab charts.
 */

function renderMoBld() {
  var GEO = window._GEO;
  var DISTRICTS = window._DISTRICTS;
  var feats = GEO.features;

  // Mock building data for features
  function bldData(p) {
    return {
      buildingLoad: p.buildingLoad || (40 + Math.random() * 55),
      buildings: p.buildings || Math.round(5 + Math.random() * 40),
      kindergartenGroups: p.kindergartenGroups || Math.round(10 + Math.random() * 120),
      kindergartenCapacity: p.kindergartenCapacity || Math.round(16 + Math.random() * 14)
    };
  }

  // 1. Building load top-12 lowest
  var topLowLoad = feats.slice().sort(function (a, b) {
    return bldData(a.properties).buildingLoad - bldData(b.properties).buildingLoad;
  }).slice(0, 12);

  var e1 = document.getElementById('ch-bldLoad');
  if (!e1._ec) e1._ec = echarts.init(e1);
  e1._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category',
      data: topLowLoad.map(function (f) { return f.properties.name_clean || f.properties.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: topLowLoad.map(function (f) { return Math.round(bldData(f.properties).buildingLoad); }),
      itemStyle: {
        color: function (p) {
          return p.data < 50 ? '#ef4444' : p.data < 80 ? '#f59e0b' : '#10b981';
        }
      },
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 }
    }]
  });

  // 2. Building count by districts
  var sampleNames = ['Лотошино', 'Клин', 'Химки', 'Шатура', 'Коломна', 'Одинцово', 'Кашира'];
  var bldCounts = sampleNames.map(function (name) {
    var f = feats.find(function (ft) { return (ft.properties.name_clean || ft.properties.name) === name; });
    return { name: name, count: f ? bldData(f.properties).buildings : Math.round(5 + Math.random() * 40) };
  }).sort(function (a, b) { return b.count - a.count; });

  var e2 = document.getElementById('ch-bldCount');
  if (!e2._ec) e2._ec = echarts.init(e2);
  e2._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: bldCounts.map(function (d) { return d.name; }), axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar',
      data: bldCounts.map(function (d) { return d.count; }),
      itemStyle: { color: '#2563eb' },
      label: { show: true, position: 'right', fontSize: 10 }
    }]
  });

  // 3. Class capacity by grades 1-11 (grouped bar for sample districts)
  var districtNames = Object.keys(DISTRICTS);
  var grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

  var series = districtNames.map(function (dName, idx) {
    var d = DISTRICTS[dName];
    var colors = ['#2563eb', '#f59e0b', '#10b981'];
    return {
      name: dName,
      type: 'bar',
      data: grades.map(function (g) {
        return d.classCapacity ? d.classCapacity[g].avg : 20 + Math.round(Math.random() * 8);
      }),
      itemStyle: { color: colors[idx % 3] }
    };
  });

  var e3 = document.getElementById('ch-bldClasses');
  if (!e3._ec) e3._ec = echarts.init(e3);
  e3._ec.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: districtNames, bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, right: 16, bottom: 40, left: 48 },
    xAxis: { type: 'category', data: grades.map(function (g) { return g + ' кл.'; }), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'чел.', min: 0, max: 32 },
    series: series,
    visualMap: {
      show: false,
      pieces: [
        { min: 0, max: 19, color: '#ef4444' },
        { min: 20, max: 24, color: '#f59e0b' },
        { min: 25, max: 32, color: '#10b981' }
      ],
      dimension: 1,
      seriesIndex: -1
    }
  });

  // 4. Kindergarten groups count
  var kinderData = districtNames.map(function (dName) {
    var d = DISTRICTS[dName];
    return { name: dName, groups: d.kindergartenGroups || 0 };
  });

  var e4 = document.getElementById('ch-bldKinder');
  if (!e4._ec) e4._ec = echarts.init(e4);
  e4._ec.setOption({
    tooltip: {},
    grid: { top: 20, right: 16, bottom: 36, left: 48 },
    xAxis: { type: 'category', data: kinderData.map(function (d) { return d.name; }), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'Групп' },
    series: [{
      type: 'bar',
      data: kinderData.map(function (d) { return d.groups; }),
      itemStyle: { color: '#8b5cf6' },
      label: { show: true, position: 'top', fontSize: 10 }
    }]
  });

  // 5. Kindergarten capacity
  var kinderCap = districtNames.map(function (dName) {
    var d = DISTRICTS[dName];
    return { name: dName, cap: d.kindergartenCapacity || 0 };
  });

  var e5 = document.getElementById('ch-bldKinderCap');
  if (!e5._ec) e5._ec = echarts.init(e5);
  e5._ec.setOption({
    tooltip: {},
    grid: { top: 20, right: 16, bottom: 36, left: 48 },
    xAxis: { type: 'category', data: kinderCap.map(function (d) { return d.name; }), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'чел.', min: 10, max: 32 },
    series: [{
      type: 'bar',
      data: kinderCap.map(function (d) {
        return {
          value: d.cap,
          itemStyle: {
            color: d.cap <= 19 ? '#ef4444' : d.cap <= 24 ? '#f59e0b' : '#10b981'
          }
        };
      }),
      label: { show: true, position: 'top', fontSize: 10 }
    }]
  });
}
