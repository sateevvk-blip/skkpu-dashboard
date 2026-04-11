/**
 * district.js — уровень Городского округа.
 *
 * Логика из patch-stage4-district.js поглощена здесь.
 * Данные читаются из AppState.
 * window._getDistrictName → window.getDistrictName (normalize.js).
 *
 * FIXES (issue #11):
 * fix(#22): исправлен оборванный .map(function(o){...}) в renderDistrict —
 *           блок теперь корректно присвоен innerHTML таблицы go-table.
 * fix(#24): исправлен getElementById('go-table') → 'tb-orgs' (несоответствие
 *           id в HTML и JS приводило к null-ref и пустой таблице организаций).
 */

function openDistrict(rawName) {
  const DISTRICTS = AppState.get('districts');
  const GEO       = AppState.get('geo');
  // Нормализация «Округ N» → реальное название
  const resolved  = (typeof window.getDistrictName === 'function')
    ? (window.getDistrictName(rawName) || rawName)
    : rawName;

  const exact = DISTRICTS[resolved];
  let dname = resolved;
  if (!exact) {
    const feat = GEO.features.find(function (f) {
      return (f.properties.name_clean || f.properties.name) === resolved;
    });
    const r = feat ? feat.properties.r : 'y';
    dname = r === 'r' ? 'Лотошино' : r === 'y' ? 'Клин' : 'Химки';
  }
  renderDistrict(dname, resolved);
}

function renderDistrict(dname, displayName) {
  const DISTRICTS = AppState.get('districts');
  const d = DISTRICTS[dname];
  state.district = displayName || dname;
  state.org = null;
  showPage('go');

  document.getElementById('go-title').textContent = state.district;
  document.getElementById('go-bname').textContent = state.district;
  document.getElementById('go-bmeta').textContent = d.meta;
  const bs = document.getElementById('go-bstat');
  bs.textContent = stxt(d.r);
  bs.className = 'go-stat ' + d.r;

  // FIX #11: фильтруем организации из отдельного справочника по districtId,
  // чтобы каждая org была привязана ровно к одному округу.
  // Если organizations ещё не загружены — fallback на d.orgs.
  var allOrgs = AppState.get('organizations') || [];
  var districtOrgs = allOrgs.filter(function (o) {
    return o.districtId === dname;
  });
  // Слияние: enriched-данные из organizations.json + финансовые поля из d.orgs
  var orgsMap = {};
  (d.orgs || []).forEach(function (o) { orgsMap[String(o.id).padStart(4, '0')] = o; });
  var orgs = districtOrgs.length > 0
    ? districtOrgs.map(function (o) {
        var enriched = orgsMap[String(o.id).padStart(4, '0')] || {};
        return Object.assign({}, o, enriched);
      })
    : (d.orgs || []);  // fallback

  const below = orgs.reduce(function (a, o) { return a + (o.below || 0); }, 0);
  const hr = d.hrMetrics || {};

  document.getElementById('go-kpis').innerHTML = [
    { l: 'Средняя ЗП педагога', v: fmtK(d.zp), d: fmtDiff(d.zp) + ' к цели', c: d.r === 'r' ? 'red' : d.r === 'y' ? 'yellow' : 'green' },
    { l: 'Педагогов ниже цели', v: below, d: 'Суммарно по организациям', c: below > 15 ? 'red' : below > 0 ? 'yellow' : 'green' },
    { l: 'АХР / педагоги', v: d.ahr + '%', d: d.ahr > 35 ? 'Выше норматива' : 'В норме', c: d.ahr > 40 ? 'red' : d.ahr > 35 ? 'yellow' : 'green' },
    { l: 'Комплектация', v: d.cap + '%', d: d.cap < 70 ? 'Ниже норматива' : 'В норме', c: d.cap < 70 ? 'red' : d.cap < 80 ? 'yellow' : 'green' }
  ].map(function (k) {
    return '<div class="kpi ' + k.c + '"><div class="kl">' + k.l + '</div><div class="kv">' + k.v + '</div><div class="kd">' + k.d + '</div></div>';
  }).join('');

  document.getElementById('go-kpis2').innerHTML = [
    { l: 'Зданий', v: d.buildings || '—', d: 'Загрузка: ' + (d.buildingLoad || '—') + '%', c: colorBuildingLoad(d.buildingLoad || 70) === 'r' ? 'red' : colorBuildingLoad(d.buildingLoad || 70) === 'y' ? 'yellow' : 'green' },
    { l: 'Наполняемость', v: (d.classCapacity ? d.classCapacity['5'].avg : '—'), d: 'Средняя по 5 классу', c: d.classCapacity ? (colorClassCapacity(d.classCapacity['5'].avg) === 'r' ? 'red' : colorClassCapacity(d.classCapacity['5'].avg) === 'y' ? 'yellow' : 'green') : 'yellow' },
    { l: 'Укомплектованность', v: (hr.staffingRate ? hr.staffingRate.toFixed(1) + '%' : '—'), d: hr.staffingRate >= 95 ? 'В норме' : 'Ниже норматива', c: colorStaffing(hr.staffingRate || 90) === 'r' ? 'red' : colorStaffing(hr.staffingRate || 90) === 'y' ? 'yellow' : 'green' },
    { l: 'Текучесть кадров', v: (hr.turnover ? hr.turnover.toFixed(1) + '%' : '—'), d: hr.turnover <= 7 ? 'В норме' : hr.turnover <= 10 ? 'Умеренная' : 'Высокая', c: colorTurnover(hr.turnover || 8) === 'r' ? 'red' : colorTurnover(hr.turnover || 8) === 'y' ? 'yellow' : 'green' }
  ].map(function (k) {
    return '<div class="kpi ' + k.c + '"><div class="kl">' + k.l + '</div><div class="kv">' + k.v + '</div><div class="kd">' + k.d + '</div></div>';
  }).join('');

  const ins = d.r === 'r' ? [
    { c: 'r', t: 'Низкая комплектация снижает ФОТ', p: 'Наполняемость ' + d.cap + '% — ниже норматива 70%. Расчётный ФОТ формируется по числу учащихся, поэтому дефицит носит системный характер.' },
    { c: 'r', t: 'АХР превышает норматив', p: 'Доля АХР ' + d.ahr + '% при норме ≤ 35%. Высвобождение 1–2 ставок позволит перераспределить средства педагогам.' },
    { c: 'y', t: 'Высокая доля внеурочки', p: d.ext + '% нагрузки — внеурочная деятельность. Признак компенсации низкой основной ставки.' },
    { c: 'r', t: 'Высокая текучесть кадров', p: 'Текучесть ' + (hr.turnover || '—') + '%. Средний срок закрытия вакансий — ' + (hr.vacancyCloseDays || '—') + ' дней.' }
  ] : d.r === 'y' ? [
    { c: 'y', t: 'Пограничный уровень ЗП', p: 'Средняя ЗП ' + fmtK(d.zp) + ' ниже цели на ' + fmtDiff(d.zp) + '. Проблема локальная, затрагивает часть организаций.' },
    { c: 'b', t: 'АХР близок к норме', p: 'Показатель ' + d.ahr + '% — на границе. Рекомендуется точечная проверка конкретных организаций.' },
    { c: 'y', t: 'Загрузка зданий умеренная', p: 'Загрузка зданий ' + (d.buildingLoad || '—') + '%. Есть потенциал для оптимизации.' }
  ] : [
    { c: 'g', t: 'Показатели в норме', p: 'Округ демонстрирует устойчивую модель. ЗП выше цели, АХР в норме, комплектация высокая.' },
    { c: 'b', t: 'Рекомендация', p: 'Возможно использование как референсного округа при тиражировании лучших практик.' },
    { c: 'g', t: 'Кадровая стабильность', p: 'Укомплектованность ' + (hr.staffingRate || '—') + '%, текучесть ' + (hr.turnover || '—') + '%. Показатели стабильны.' }
  ];
  document.getElementById('go-insights').innerHTML = ins.map(function (x) {
    return '<div class="insight ' + x.c + '"><h4>' + x.t + '</h4><p>' + x.p + '</p></div>';
  }).join('');

  // fix(#22): восстановлен оборванный .map(function(o){...}) —
  // fix(#24): исправлен getElementById('go-table') → getElementById('tb-orgs') —
  //           в index.html тело таблицы организаций имеет id="tb-orgs".
  document.getElementById('tb-orgs').innerHTML = orgs.map(function (o) {
    var orgIdDisplay = String(o.id || o.orgId || '').padStart(4, '0');
    return '<tr onclick=\'openOrg(' + JSON.stringify(o).replace(/'/g, "&#39;") + ')\'>' +
      '<td style="font-family:monospace;color:var(--color-text-muted,#888);white-space:nowrap">' + orgIdDisplay + '</td>' +
      '<td><b>' + o.name + '</b></td><td>' + o.type + '</td>' +
      '<td style="font-weight:700;color:' + (o.zp >= TARGET ? '#059669' : '#dc2626') + '">' + fmtK(o.zp) + '</td>' +
      '<td style="color:' + (o.below > 5 ? '#dc2626' : o.below > 0 ? '#d97706' : '#374151') + '">' + (o.below || 0) + '</td>' +
      '<td>' + (o.ahr || '—') + '%</td><td>' + (o.cap || '—') + '%</td>' +
      '<td>' + (o.buildings || '—') + '</td>' +
      '<td style="color:' + zoneColor(colorBuildingLoad(o.buildingLoad || 70)) + '">' + (o.buildingLoad || '—') + '%</td>' +
      '<td style="color:' + zoneColor(colorStaffing(o.staffingRate || 90)) + '">' + (o.staffingRate || '—') + '%</td>' +
      '<td style="color:' + zoneColor(colorTurnover(o.turnover || 8)) + '">' + (o.turnover || '—') + '%</td>' +
      '<td>' + pill(o.r) + '</td></tr>';
  }).join('');

  // Исправление названий в таблице — из patch-stage3-table.js
  const districts = AppState.get('districts') || {};
  const dKeys = Object.keys(districts);
  const tb = document.getElementById('tb-districts');
  if (tb) {
    tb.querySelectorAll('tr').forEach(function (tr) {
      const td = tr.querySelector('td:first-child b'); if (!td) return;
      const raw = td.textContent;
      if (/^Округ\s+\d+$/i.test(raw)) {
        const m = String(raw).match(/^Округ\s+(\d+)$/i);
        if (m) { const idx = parseInt(m[1], 10) - 1; const fixed = dKeys[idx] || raw; td.textContent = fixed;
          const onclick = tr.getAttribute('onclick') || '';
          if (onclick.indexOf(raw) !== -1) tr.setAttribute('onclick', onclick.replace(raw, fixed));
        }
      }
    });
  }

  const toastMap = {
    r: ['⚠️', 'Критичный округ', 'Зафиксированы системные нарушения. Рекомендуется проверка организаций.', 'r'],
    y: ['📋', 'Округ под наблюдением', 'Часть организаций требует внимания.', 'y'],
    g: ['✅', 'Стабильный округ', 'Показатели в норме. Можно использовать как референс.', 'g']
  };
  const t = toastMap[d.r];
  toast(t[0], t[1], t[2], t[3]);

  setTimeout(function () {
    const el = document.getElementById('ch-goSalBar');
    if (!el._ec) el._ec = echarts.init(el);
    el._ec.setOption({
      grid: { top: 10, right: 60, bottom: 10, left: 10 },
      xAxis: { type: 'value', min: 50000, max: 90000 },
      yAxis: { type: 'category', data: orgs.map(function (o) { return o.name.replace(/МБОУ «|»/g, ''); }) },
      tooltip: { formatter: function (p) { return p.name + ': ' + fmt(p.value); } },
      series: [{ type: 'bar', data: orgs.map(function (o) { return o.zp; }),
        itemStyle: { color: function (p) { return p.data < 66000 ? '#ef4444' : p.data < TARGET ? '#f59e0b' : '#10b981'; } },
        label: { show: true, position: 'right', formatter: function (p) { return fmtK(p.value); } }
      }]
    });
  }, 80);
}
