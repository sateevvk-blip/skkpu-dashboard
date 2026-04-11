/**
 * map.js — Leaflet-карта с фильтрами и метриками.
 *
 * Логика из patch-stage3-map.js поглощена здесь.
 * Данные читаются из AppState.
 */

var map;

function initMap(geoData) {
  map = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 13 }).addTo(map);

  let layer = null;
  const metric = 'zp';

  function getColor(val) {
    return val >= 72000 ? '#10b981' : val >= 66000 ? '#f59e0b' : '#ef4444';
  }

  function normalizeFeatureNames() {
    const districts = AppState.get('districts');
    if (!districts) return;
    const dKeys = Object.keys(districts);
    geoData.features.forEach(function (f) {
      const p = f.properties || {};
      if (p.name_clean && !/^\u041eкруг\s+\d+$/i.test(p.name_clean)) return;
      const candidate = p.name_clean || p.name || '';
      if (/^\u041eкруг\s+\d+$/i.test(candidate)) {
        const num = parseInt(candidate.replace(/\D+/g, ''), 10) - 1;
        if (dKeys[num]) p.name_clean = dKeys[num];
      } else {
        const lower = candidate.toLowerCase();
        const match = dKeys.find(function (k) {
          return k.toLowerCase() === lower ||
                 k.toLowerCase().indexOf(lower) !== -1 ||
                 lower.indexOf(k.toLowerCase()) !== -1;
        });
        p.name_clean = match || candidate;
      }
    });
  }

  normalizeFeatureNames();

  function render() {
    if (layer) map.removeLayer(layer);
    layer = L.geoJSON(geoData, {
      style: function (feature) {
        const val = feature.properties[metric] || 0;
        return { fillColor: getColor(val), color: '#fff', weight: 1, fillOpacity: 0.7 };
      },
      onEachFeature: function (feature, lyr) {
        const p    = feature.properties;
        const name = p.name_clean || p.name;
        lyr.bindPopup(
          '<b>' + name + '</b><br>' +
          'ЗП: ' + (p.zp ? fmtK(p.zp) : '—') + '<br>' +
          'АХР: ' + (p.ahr || '—') + '%<br>' +
          'Комплектация: ' + (p.cap || '—') + '%'
        );
        lyr.on('click', function () { openDistrict(name); });
      }
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [8, 8] });
  }

  render();
}
