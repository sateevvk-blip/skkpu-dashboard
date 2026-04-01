/**
 * District (GO) level — rendering and drill-down.
 */

function openDistrict(name) {
  var DISTRICTS = window._DISTRICTS;
  var GEO = window._GEO;
  var exact = DISTRICTS[name];
  var dname = name;
  if (!exact) {
    var feat = GEO.features.find(function (f) { return (f.properties.name_clean || f.properties.name) === name; });
    var r = feat ? feat.properties.r : 'y';
    dname = r === 'r' ? 'Лотошино' : r === 'y' ? 'Клин' : 'Химки';
  }
  renderDistrict(dname, name);
}

function renderDistrict(dname, displayName) {
  var DISTRICTS = window._DISTRICTS;
  var d = DISTRICTS[dname];
  state.district = displayName || dname;
  state.org = null;
  showPage('go');

  document.getElementById('go-title').textContent = state.district;
  document.getElementById('go-bname').textContent = state.district;
  document.getElementById('go-bmeta').textContent = d.meta;
  var bs = document.getElementById('go-bstat');
  bs.textContent = stxt(d.r);
  bs.className = 'go-stat ' + d.r;

  var below = d.orgs.reduce(function (a, o) { return a + o.below; }, 0);
  document.getElementById('go-kpis').innerHTML = [
    { l: 'Средняя ЗП педагога', v: fmtK(d.zp), d: fmtDiff(d.zp) + ' к цели', c: d.r === 'r' ? 'red' : d.r === 'y' ? 'yellow' : 'green' },
    { l: 'Педагогов ниже цели', v: below, d: 'Суммарно по организациям', c: below > 15 ? 'red' : below > 0 ? 'yellow' : 'green' },
    { l: 'АХР / педагоги', v: d.ahr + '%', d: d.ahr > 35 ? 'Выше норматива' : 'В норме', c: d.ahr > 40 ? 'red' : d.ahr > 35 ? 'yellow' : 'green' },
    { l: 'Комплектация', v: d.cap + '%', d: d.cap < 70 ? 'Ниже норматива' : 'В норме', c: d.cap < 70 ? 'red' : d.cap < 80 ? 'yellow' : 'green' }
  ].map(function (k) {
    return '<div class="kpi ' + k.c + '"><div class="kl">' + k.l + '</div><div class="kv">' + k.v + '</div><div class="kd">' + k.d + '</div></div>';
  }).join('');

  var ins = d.r === 'r' ? [
    { c: 'r', t: 'Низкая комплектация снижает ФОТ', p: 'Наполняемость ' + d.cap + '% — ниже норматива 70%. Расчётный ФОТ формируется по числу учащихся, поэтому дефицит носит системный характер.' },
    { c: 'r', t: 'АХР превышает норматив', p: 'Доля АХР ' + d.ahr + '% при норме ≤ 35%. Высвобождение 1–2 ставок позволит перераспределить средства педагогам.' },
    { c: 'y', t: 'Высокая доля внеурочки', p: d.ext + '% нагрузки — внеурочная деятельность. Признак компенсации низкой основной ставки.' }
  ] : d.r === 'y' ? [
    { c: 'y', t: 'Пограничный уровень ЗП', p: 'Средняя ЗП ' + fmtK(d.zp) + ' ниже цели на ' + fmtDiff(d.zp) + '. Проблема локальная, затрагивает часть организаций.' },
    { c: 'b', t: 'АХР близок к норме', p: 'Показатель ' + d.ahr + '% — на границе. Рекомендуется точечная проверка конкретных организаций.' }
  ] : [
    { c: 'g', t: 'Показатели в норме', p: 'Округ демонстрирует устойчивую модель. ЗП выше цели, АХР в норме, комплектация высокая.' },
    { c: 'b', t: 'Рекомендация', p: 'Возможно использование как референсного округа при тиражировании лучших практик.' }
  ];
  document.getElementById('go-insights').innerHTML = ins.map(function (x) {
    return '<div class="insight ' + x.c + '"><h4>' + x.t + '</h4><p>' + x.p + '</p></div>';
  }).join('');

  document.getElementById('tb-orgs').innerHTML = d.orgs.map(function (o) {
    return '<tr onclick=\'openOrg(' + JSON.stringify(o) + ')\'>' +
      '<td><b>' + o.name + '</b></td><td>' + o.type + '</td>' +
      '<td style="font-weight:700;color:' + (o.zp >= TARGET ? '#059669' : '#dc2626') + '">' + fmtK(o.zp) + '</td>' +
      '<td style="color:' + (o.below > 5 ? '#dc2626' : o.below > 0 ? '#d97706' : '#374151') + '">' + o.below + '</td>' +
      '<td>' + o.ahr + '%</td><td>' + o.cap + '%</td><td>' + pill(o.r) + '</td></tr>';
  }).join('');

  var toastMap = {
    r: ['⚠️', 'Критичный округ', 'Зафиксированы системные нарушения. Рекомендуется проверка организаций.', 'r'],
    y: ['📋', 'Округ под наблюдением', 'Часть организаций требует внимания.', 'y'],
    g: ['✅', 'Стабильный округ', 'Показатели в норме. Можно использовать как референс.', 'g']
  };
  var t = toastMap[d.r];
  toast(t[0], t[1], t[2], t[3]);

  setTimeout(function () {
    var el = document.getElementById('ch-goSalBar');
    if (!el._ec) el._ec = echarts.init(el);
    el._ec.setOption({
      grid: { top: 10, right: 60, bottom: 10, left: 10 },
      xAxis: { type: 'value', min: 50000, max: 90000 },
      yAxis: { type: 'category', data: d.orgs.map(function (o) { return o.name.replace(/МБОУ «|»/g, ''); }) },
      tooltip: { formatter: function (p) { return p.name + ': ' + fmt(p.value); } },
      series: [{
        type: 'bar',
        data: d.orgs.map(function (o) { return o.zp; }),
        itemStyle: { color: function (p) { return p.data < 66000 ? '#ef4444' : p.data < TARGET ? '#f59e0b' : '#10b981'; } },
        label: { show: true, position: 'right', formatter: function (p) { return fmtK(p.value); } }
      }]
    });
  }, 80);
}
