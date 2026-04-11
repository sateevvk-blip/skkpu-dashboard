/**
 * map.js — Leaflet-карта с фильтрами и метриками.
 *
 * fix(#14): обработчик change фильтра записывает метрику в AppState,
 *           getColor/попап читают текущую метрику из AppState.
 */

var map;

function initMap(geoData) {
  map = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 13 }).addTo(map);

  var layer = null;

  // Конфиг метрик — пороги из docs/role.md
  var METRIC_CONFIG = {
    zp: {
      label: 'Средняя ЗП',
      thresholds: [50000, 75000],
      format: function (v) { return v ? fmtK(v) : '—'; }
    },
    staffingRate: {
      label: 'Комплектация',
      thresholds: [0.85, 0.95],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; }
    },
    age: {
      label: 'Средний возраст',
      thresholds: [35, 50],
      format: function (v) { return v != null ? v.toFixed(1) + ' лет' : '—'; }
    },
    experience: {
      label: 'Средний стаж',
      thresholds: [3, 7],
      format: function (v) { return v != null ? v.toFixed(1) + ' лет' : '—'; }
    }
  };

  function getCurrentMetric() {
    return AppState.get('mapMetric') || 'zp';
  }

  function getColor(val, metricKey) {
    var cfg = METRIC_CONFIG[metricKey] || METRIC_CONFIG.zp;
    var t0 = cfg.thresholds[0];
    var t1 = cfg.thresholds[1];
    if (val == null || isNaN(val)) return '#9ca3af';
    return val >= t1 ? '#10b981' : val >= t0 ? '#f59e0b' : '#ef4444';
  }

  function normalizeFeatureNames() {
    var districts = AppState.get('districts');
    if (!districts) return;
    var dKeys = Object.keys(districts);
    geoData.features.forEach(function (f) {
      var p = f.properties || {};
      if (p.name_clean && !/^Округ\s+\d+$/i.test(p.name_clean)) return;
      var candidate = p.name_clean || p.name || '';
      if (/^Округ\s+\d+$/i.test(candidate)) {
        var num = parseInt(candidate.replace(/\D+/g, ''), 10) - 1;
        if (dKeys[num]) p.name_clean = dKeys[num];
      } else {
        var lower = candidate.toLowerCase();
        var match = dKeys.find(function (k) {
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
    var metric = getCurrentMetric();
    var cfg = METRIC_CONFIG[metric] || METRIC_CONFIG.zp;
    if (layer) map.removeLayer(layer);
    layer = L.geoJSON(geoData, {
      style: function (feature) {
        var val = feature.properties[metric];
        return {
          fillColor: getColor(val, metric),
          color: '#fff',
          weight: 1,
          fillOpacity: 0.7
        };
      },
      onEachFeature: function (feature, lyr) {
        var p    = feature.properties;
        var name = p.name_clean || p.name;
        var val  = p[metric];
        lyr.bindPopup(
          '<b>' + name + '</b><br>' +
          cfg.label + ': ' + cfg.format(val)
        );
        lyr.on('click', function () { openDistrict(name); });
      }
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [8, 8] });
  }

  // Обработчик фильтра
  var filterEl = document.getElementById('map-filter');
  if (filterEl) {
    AppState.set('mapMetric', filterEl.value || 'zp');
    filterEl.addEventListener('change', function () {
      AppState.set('mapMetric', this.value);
      render();
    });
  }

  render();
}
