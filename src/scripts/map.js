/**
 * Leaflet map initialisation and interaction.
 */
var map, geoLayer;

function colorMetric(p) {
  if (state.metric === 'zp')  return p.r === 'r' ? '#ef4444' : p.r === 'y' ? '#f59e0b' : '#10b981';
  if (state.metric === 'ahr') return p.ahr > 40 ? '#ef4444' : p.ahr > 35 ? '#f59e0b' : '#10b981';
  if (state.metric === 'cap') return p.cap < 70 ? '#ef4444' : p.cap < 80 ? '#f59e0b' : '#10b981';
  if (state.metric === 'ext') return p.ext > 30 ? '#ef4444' : p.ext > 25 ? '#f59e0b' : '#10b981';
  if (state.metric === 'bload') {
    var bl = p.buildingLoad || 70;
    return bl < 50 ? '#ef4444' : bl < 80 ? '#f59e0b' : '#10b981';
  }
  if (state.metric === 'staffing') {
    var sr = p.staffingRate || 90;
    return sr < 85 ? '#ef4444' : sr < 95 ? '#f59e0b' : '#10b981';
  }
  if (state.metric === 'turnover') {
    var tr = p.turnover || 8;
    return tr > 10 ? '#ef4444' : tr > 7 ? '#f59e0b' : '#10b981';
  }
  return p.ext > 30 ? '#ef4444' : p.ext > 25 ? '#f59e0b' : '#10b981';
}

function metricLabel(p) {
  if (state.metric === 'zp') return 'ЗП: <b>' + fmtK(p.zp) + '</b>';
  if (state.metric === 'ahr') return 'АХР: <b>' + p.ahr + '%</b>';
  if (state.metric === 'cap') return 'Компл.: <b>' + p.cap + '%</b>';
  if (state.metric === 'ext') return 'Внеурочка: <b>' + p.ext + '%</b>';
  if (state.metric === 'bload') return 'Загрузка зд.: <b>' + (p.buildingLoad || '—') + '%</b>';
  if (state.metric === 'staffing') return 'Укомпл.: <b>' + (p.staffingRate || '—') + '%</b>';
  if (state.metric === 'turnover') return 'Текучесть: <b>' + (p.turnover || '—') + '%</b>';
  return '';
}

function styleF(f) {
  var p = f.properties;
  var vis = !state.filter || p.r === state.filter;
  return {
    fillColor: colorMetric(p),
    weight: 1.2,
    color: '#fff',
    fillOpacity: vis ? .78 : .1,
    opacity: vis ? 1 : .2
  };
}

function initMap(GEO) {
  map = L.map('map', { attributionControl: false }).setView([55.7, 37.8], 8);
  L.control.attribution({ prefix: '© OpenStreetMap © CARTO' }).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { subdomains: 'abcd', maxZoom: 14 }).addTo(map);

  geoLayer = L.geoJSON(GEO, {
    style: styleF,
    onEachFeature: function (feature, layer) {
      var p = feature.properties;
      var nm = p.name_clean || p.name || '?';
      layer.bindPopup(
        '<div style="font-size:12px;min-width:200px">' +
        '<b style="font-size:13px">' + nm + '</b>' +
        '<div style="margin:6px 0;padding:4px 8px;border-radius:6px;background:' +
          (p.r === 'r' ? '#fef2f2' : p.r === 'y' ? '#fffbeb' : '#f0fdf4') +
          ';font-weight:700;font-size:11px">' + stxt(p.r) + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;margin-bottom:8px">' +
          '<div>ЗП: <b>' + fmtK(p.zp) + '</b></div><div>АХР: <b>' + p.ahr + '%</b></div>' +
          '<div>Компл.: <b>' + p.cap + '%</b></div><div>Внеурочка: <b>' + p.ext + '%</b></div>' +
          '<div>Загр. зд.: <b>' + (p.buildingLoad || '—') + '%</b></div>' +
          '<div>Укомпл.: <b>' + (p.staffingRate || '—') + '%</b></div>' +
          '<div>Текучесть: <b>' + (p.turnover || '—') + '%</b></div>' +
        '</div>' +
        '<button onclick="openDistrict(\'' + nm.replace(/'/g, "\\'") + '\');map.closePopup()"' +
          ' style="width:100%;padding:7px;border:none;background:#2563eb;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px">' +
          'Открыть уровень ГО →</button></div>',
        { maxWidth: 260 }
      );
      layer.on('mouseover', function () { layer.setStyle({ weight: 2.5, color: '#2563eb', fillOpacity: .92 }); });
      layer.on('mouseout', function () { geoLayer.resetStyle(layer); });
    }
  }).addTo(map);

  map.fitBounds(geoLayer.getBounds(), { padding: [8, 8] });
  toast('💡', 'Как начать работу', 'Нажмите на сегмент округа на карте или выберите строку в таблице «Анализ ЗП»');
}

function setMetric(m, btn) {
  state.metric = m;
  document.querySelectorAll('.map-metrics .mf-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  if (geoLayer) geoLayer.setStyle(styleF);
}

function filterMap(r, btn) {
  state.filter = r;
  document.querySelectorAll('.map-filters .mf-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  if (geoLayer) geoLayer.setStyle(styleF);
}
