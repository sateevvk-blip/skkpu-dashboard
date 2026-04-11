/**
 * map.js — Leaflet-карта с фильтрами и метриками.
 *
 * fix(#14): обработчик change фильтра записывает метрику в AppState,
 *           getColor/попап читают текущую метрику из AppState.
 *
 * fix(#15): по клику на полигон округа показывается попап с названием
 *           и кнопкой «Перейти в округ». Прямая навигация убрана.
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

  /**
   * Строит HTML-содержимое попапа для округа.
   * Кнопка «Перейти в округ» вызывает openDistrict через
   * глобальный обработчик window._mapGoDistrict.
   */
  function buildPopupContent(name, metric, cfg) {
    var districts = AppState.get('districts') || {};
    var val = districts[name] ? districts[name][metric] : null;
    // Сохраняем имя в глобальном scope для доступа из onclick
    window._mapGoDistrict = function () { openDistrict(name); };
    return '<div style="min-width:160px">' +
      '<b style="font-size:13px">' + name + '</b><br>' +
      '<span style="font-size:12px;color:#666">' + cfg.label + ': ' + cfg.format(val) + '</span><br>' +
      '<button ' +
        'onclick="window._mapGoDistrict()" ' +
        'style="margin-top:8px;padding:4px 12px;background:#01696f;color:#fff;' +
        'border:none;border-radius:4px;cursor:pointer;font-size:12px">' +
        'Перейти в округ' +
      '</button>' +
    '</div>';
  }

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

        // fix(#15): клик открывает попап с подтверждением, навигация — только по кнопке
        lyr.on('click', function (e) {
          var currentMetric = getCurrentMetric();
          var currentCfg = METRIC_CONFIG[currentMetric] || METRIC_CONFIG.zp;
          lyr.unbindPopup();
          lyr.bindPopup(buildPopupContent(name, currentMetric, currentCfg));
          lyr.openPopup(e.latlng);
        });
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
