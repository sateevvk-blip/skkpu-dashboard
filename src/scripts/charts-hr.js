/**
 * MO-level HR (Кадры) tab charts.
 */

function renderMoHr() {
  var GEO = window._GEO;
  var feats = GEO.features;

  // Mock HR data for geo features that don't have it
  function hrData(p) {
    return {
      staffingRate: p.staffingRate || (85 + Math.random() * 15),
      turnover: p.turnover || (3 + Math.random() * 14),
      avgAge: p.avgAge || (34 + Math.random() * 22),
      avgExperience: p.avgExperience || (2 + Math.random() * 16),
      firedProbation: p.firedProbation || (1 + Math.random() * 10),
      fired6m: p.fired6m || (2 + Math.random() * 14),
      fired1y: p.fired1y || (3 + Math.random() * 18),
      vacancyCloseDays: p.vacancyCloseDays || (20 + Math.random() * 60)
    };
  }

  // 1. Staffing gauge
  var totalStaffing = 0;
  var cnt = 0;
  feats.forEach(function (f) {
    var h = hrData(f.properties);
    totalStaffing += h.staffingRate;
    cnt++;
  });
  var avgStaffing = totalStaffing / cnt;

  var e1 = document.getElementById('ch-hrStaffing');
  if (!e1._ec) e1._ec = echarts.init(e1);
  e1._ec.setOption({
    series: [{
      type: 'gauge', startAngle: 200, endAngle: -20, min: 70, max: 100,
      progress: { show: true, width: 14 },
      axisLine: { lineStyle: { width: 14, color: [[0.5, '#ef4444'], [0.83, '#f59e0b'], [1, '#10b981']] } },
      axisTick: { show: false }, splitLine: { distance: -16, length: 8 },
      axisLabel: { distance: -28, fontSize: 10 },
      pointer: { length: '55%', width: 6 },
      detail: { formatter: '{value}%', fontSize: 28, offsetCenter: [0, '30%'], fontWeight: 'bold' },
      title: { offsetCenter: [0, '55%'], fontSize: 11, color: '#6b7280' },
      data: [{ value: Math.round(avgStaffing * 10) / 10, name: 'Средняя укомплектованность' }]
    }]
  });

  // 2. Age distribution (donut)
  var ageGroups = { young: 0, middle: 0, senior: 0 };
  feats.forEach(function (f) {
    var h = hrData(f.properties);
    if (h.avgAge < 35) ageGroups.young++;
    else if (h.avgAge <= 50) ageGroups.middle++;
    else ageGroups.senior++;
  });

  var e2 = document.getElementById('ch-hrAge');
  if (!e2._ec) e2._ec = echarts.init(e2);
  e2._ec.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      data: [
        { value: ageGroups.young, name: 'До 35 лет', itemStyle: { color: '#f59e0b' } },
        { value: ageGroups.middle, name: '35–50 лет', itemStyle: { color: '#10b981' } },
        { value: ageGroups.senior, name: '50+ лет', itemStyle: { color: '#ef4444' } }
      ]
    }]
  });

  // 3. Turnover top-12
  var topTurnover = feats.slice().sort(function (a, b) {
    return hrData(b.properties).turnover - hrData(a.properties).turnover;
  }).slice(0, 12);

  var e3 = document.getElementById('ch-hrTurnover');
  if (!e3._ec) e3._ec = echarts.init(e3);
  e3._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
    xAxis: { type: 'value', max: 20, axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category',
      data: topTurnover.map(function (f) { return f.properties.name_clean || f.properties.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: topTurnover.map(function (f) { return Math.round(hrData(f.properties).turnover * 10) / 10; }),
      itemStyle: {
        color: function (p) {
          return p.data > 10 ? '#ef4444' : p.data > 7 ? '#f59e0b' : '#10b981';
        }
      },
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 }
    }]
  });

  // 4. Experience top-12 lowest
  var topLowExp = feats.slice().sort(function (a, b) {
    return hrData(a.properties).avgExperience - hrData(b.properties).avgExperience;
  }).slice(0, 12);

  var e4 = document.getElementById('ch-hrExp');
  if (!e4._ec) e4._ec = echarts.init(e4);
  e4._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 52, bottom: 8, left: 130 },
    xAxis: { type: 'value', max: 18, axisLabel: { formatter: '{value} лет' } },
    yAxis: {
      type: 'category',
      data: topLowExp.map(function (f) { return f.properties.name_clean || f.properties.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: topLowExp.map(function (f) { return Math.round(hrData(f.properties).avgExperience * 10) / 10; }),
      itemStyle: {
        color: function (p) {
          return p.data < 3 ? '#ef4444' : p.data <= 6 ? '#f59e0b' : '#10b981';
        }
      },
      label: { show: true, position: 'right', formatter: '{c} лет', fontSize: 10 }
    }]
  });

  // 5. Fired % stacked bar
  var sampleDistricts = ['Лотошино', 'Клин', 'Химки', 'Шатура', 'Кашира', 'Коломна', 'Одинцово'];
  var firedData = sampleDistricts.map(function (name) {
    var f = feats.find(function (ft) { return (ft.properties.name_clean || ft.properties.name) === name; });
    var h = f ? hrData(f.properties) : hrData({});
    return { name: name, probation: Math.round(h.firedProbation * 10) / 10, m6: Math.round(h.fired6m * 10) / 10, y1: Math.round(h.fired1y * 10) / 10 };
  });

  var e5 = document.getElementById('ch-hrFired');
  if (!e5._ec) e5._ec = echarts.init(e5);
  e5._ec.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Испыт. срок', '6 месяцев', 'Год'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, right: 16, bottom: 40, left: 100 },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: firedData.map(function (d) { return d.name; }), axisLabel: { fontSize: 10 } },
    series: [
      { name: 'Испыт. срок', type: 'bar', stack: 'fired', data: firedData.map(function (d) { return d.probation; }), itemStyle: { color: '#fbbf24' } },
      { name: '6 месяцев', type: 'bar', stack: 'fired', data: firedData.map(function (d) { return d.m6; }), itemStyle: { color: '#f59e0b' } },
      { name: 'Год', type: 'bar', stack: 'fired', data: firedData.map(function (d) { return d.y1; }), itemStyle: { color: '#ef4444' } }
    ]
  });

  // 6. Vacancy close time
  var topVacancy = feats.slice().sort(function (a, b) {
    return hrData(b.properties).vacancyCloseDays - hrData(a.properties).vacancyCloseDays;
  }).slice(0, 10);

  var e6 = document.getElementById('ch-hrVacancy');
  if (!e6._ec) e6._ec = echarts.init(e6);
  e6._ec.setOption({
    tooltip: {}, grid: { top: 8, right: 70, bottom: 8, left: 130 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value} дн.' } },
    yAxis: {
      type: 'category',
      data: topVacancy.map(function (f) { return f.properties.name_clean || f.properties.name; }),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: topVacancy.map(function (f) { return Math.round(hrData(f.properties).vacancyCloseDays); }),
      itemStyle: {
        color: function (p) {
          var months = p.data / 30;
          return months > 2 ? '#ef4444' : months > 1.5 ? '#f59e0b' : '#10b981';
        }
      },
      label: { show: true, position: 'right', formatter: function (p) { return p.data + ' дн. (' + (p.data / 30).toFixed(1) + ' мес.)'; }, fontSize: 10 }
    }]
  });
}
